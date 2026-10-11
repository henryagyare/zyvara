import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { eq, sql } from "drizzle-orm";
import { getDb, closeDb } from "../src/server/db";
import { seed } from "../src/server/seed";
import * as schema from "../src/server/schema";
import * as service from "../src/server/services";
import { upsertMember, type Member } from "../src/server/auth";
import {
  validatePhoto,
  MAX_PHOTO_BYTES,
  putObject,
} from "../src/server/storage";
import { mockProvider, validateProviderResult } from "../src/server/assessment";
import { challengeInput } from "../src/server/validation";
import {
  createZyvaraGeminiProvider,
  geminiProvider,
} from "../src/server/gemini-assessment";
let folder: string;
let alice: Member;
let bob: Member;
let creator: Member;
let photo: Buffer;
test("Gemini adapter runs through saved evidence, failed-job retry, persisted verdict, and one award", async () => {
  const previousProvider = process.env.ASSESSMENT_PROVIDER;
  const original = geminiProvider.assess;
  let fail = true;
  let calls = 0;
  const live = createZyvaraGeminiProvider(
    {
      generate: async (parts) => {
        calls++;
        if (fail) throw { status: 503, message: "private-provider-error" };
        const fields = JSON.parse(
          parts[0].text!.split("\n").slice(1).join("\n"),
        );
        assert.deepEqual(fields.requirements, ["Show the result."]);
        assert.equal(parts[1].text, "SUBMITTED IMAGE");
        return JSON.stringify({
          status: "supported",
          confidence: "medium",
          observations: ["The submitted result is visible."],
          requirements: fields.requirements.map((requirement: string) => ({
            requirement,
            status: "supported",
            explanation: "Visible result.",
          })),
          feedback: "The evidence supports the saved requirement.",
          nextStep: "View your progress.",
        });
      },
    },
    { model: "fake-gemini-integration" },
  );
  geminiProvider.assess = live.assess;
  process.env.ASSESSMENT_PROVIDER = "gemini";
  try {
    const c = await challenge("Gemini integration action");
    const row = await contribute(c.id);
    const db = await getDb();
    await db
      .update(schema.challenges)
      .set({ requirements: ["Edited after acceptance"] })
      .where(eq(schema.challenges.id, c.id));
    const failed = await service.processAssessment(alice, row.id);
    assert.equal(failed.job.state, "failed");
    assert.equal(failed.points, 0);
    assert.equal(calls, 1);
    fail = false;
    await db
      .update(schema.jobs)
      .set({ retryAt: new Date(0) })
      .where(eq(schema.jobs.id, failed.job.id));
    await Promise.all(
      Array.from({ length: 4 }, () => service.processAssessment(alice, row.id)),
    );
    const saved = await service.contributionDetail(alice, row.id);
    assert.equal(saved.evidence.id, failed.evidence.id);
    assert.equal(saved.assessment?.simulated, false);
    assert.equal(saved.assessment?.outcome, "supported");
    assert.equal(saved.points, 50);
    assert.equal(calls, 2);
    await service.processAssessment(alice, row.id);
    assert.equal(calls, 2);
    const awards = await db
      .select()
      .from(schema.rewards)
      .where(eq(schema.rewards.contributionId, row.id));
    assert.equal(awards.length, 1);
  } finally {
    geminiProvider.assess = original;
    if (previousProvider === undefined) delete process.env.ASSESSMENT_PROVIDER;
    else process.env.ASSESSMENT_PROVIDER = previousProvider;
  }
});
before(async () => {
  await mkdir(".data", { recursive: true });
  folder = await mkdtemp(path.resolve(".data", "test-"));
  process.env.LOCAL_DATA_DIR = folder;
  process.env.STORAGE_MODE = process.env.TEST_STORAGE_MODE || "local";
  delete process.env.DATABASE_URL;
  await seed();
  alice = await upsertMember("test:alice", "Alice");
  bob = await upsertMember("test:bob", "Bob");
  creator = await upsertMember("test:creator", "Creator");
  photo = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#245C42" },
  })
    .png()
    .toBuffer();
});
after(async () => {
  await closeDb();
  await rm(folder, { recursive: true, force: true });
});
test(
  "database photo storage retains sanitized copies, removes staging bytes, and rejects oversized objects",
  { skip: process.env.TEST_STORAGE_MODE !== "postgres" },
  async () => {
    const db = await getDb();
    const slot = await service.allocateUpload(alice, "result", "image/png");
    const annotated = await sharp(photo)
      .withExif({ IFD0: { Artist: "Private author" } })
      .png()
      .toBuffer();
    await service.receiveLocalUpload(alice, slot.id, annotated, "image/png");
    const [staging] = await db
      .select()
      .from(schema.mediaObjects)
      .where(eq(schema.mediaObjects.key, `originals/${alice.id}/${slot.id}`));
    const metadata = await sharp(
      Buffer.from(staging.encoded, "base64"),
    ).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.exif, undefined);
    await Promise.all([
      service.finalizeUpload(alice, slot.id),
      service.finalizeUpload(alice, slot.id),
    ]);
    assert.equal(
      (
        await db
          .select()
          .from(schema.mediaObjects)
          .where(eq(schema.mediaObjects.key, staging.key))
      ).length,
      0,
    );
    assert.equal(
      (
        await db
          .select()
          .from(schema.mediaObjects)
          .where(
            eq(
              schema.mediaObjects.key,
              `derivatives/${alice.id}/${slot.id}.webp`,
            ),
          )
      ).length,
      1,
    );
    await assert.rejects(
      putObject(
        `derivatives/${alice.id}/oversized.webp`,
        Buffer.alloc(1024 * 1024 + 1),
        "image/webp",
      ),
    );
    await assert.rejects(putObject("../../outside", photo, "image/png"));
  },
);
async function challenge(title = "Test action") {
  return service.createChallenge(creator, {
    title,
    category: "Cleanup",
    description: "Do a safe action",
    requirements: ["Show the result."],
  });
}
async function upload(member = alice, role = "result") {
  const slot = await service.allocateUpload(member, role, "image/png");
  await service.receiveLocalUpload(member, slot.id, photo, "image/png");
  await service.finalizeUpload(member, slot.id);
  return slot.id;
}
async function contribute(
  challengeId: string,
  scenario = "supported",
  member = alice,
  consent = false,
) {
  return service.finalizeEvidence(member, {
    challengeId,
    description: "I completed this safely.",
    resultUploadId: await upload(member),
    scenario,
    consent,
  });
}
test("idempotent seed, durable discovery filters, validation and actual detail", async () => {
  await seed();
  const db = await getDb();
  const editorial = await db
    .select()
    .from(schema.challenges)
    .where(eq(schema.challenges.creatorId, "zyvara-editorial"));
  assert.equal(editorial.length, 4);
  const row = await challenge("Unique cleanup filter");
  assert.equal(
    (await service.discover("Cleanup", "Unique cleanup filter"))[0].id,
    row.id,
  );
  assert.equal(
    (await service.discover("Planting", "Unique cleanup filter")).length,
    0,
  );
  assert.equal((await service.challengeDetail(row.id)).title, row.title);
  assert.throws(() => challengeInput.parse({ title: "x".repeat(81) }));
  await assert.rejects(
    service.createChallenge(alice, {
      title: "Old",
      category: "Cleanup",
      description: "x",
      requirements: ["x"],
      deadline: new Date(Date.now() - 10000).toISOString(),
    }),
  );
});
test("server photo checks real type, decoding, size, metadata removal and ownership", async () => {
  await assert.rejects(validatePhoto(Buffer.from("not a photo"), "image/png"));
  await assert.rejects(validatePhoto(photo, "image/jpeg"));
  await assert.rejects(validatePhoto(Buffer.alloc(MAX_PHOTO_BYTES + 1)));
  const withMetadata = await sharp(photo)
    .withExif({ IFD0: { Artist: "Private author" } })
    .png()
    .toBuffer();
  const checked = await validatePhoto(withMetadata, "image/png");
  const metadata = await sharp(checked.derivative).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.exif, undefined);
  const slot = await service.allocateUpload(alice, "result", "image/png");
  await assert.rejects(
    service.receiveLocalUpload(bob, slot.id, photo, "image/png"),
  );
  await assert.rejects(service.finalizeUpload(bob, slot.id));
});
test("private evidence, explicit publication, withdrawal, concurrent requests and ledger reconcile", async () => {
  const c = await challenge();
  const contribution = await contribute(c.id);
  await assert.rejects(service.contributionDetail(bob, contribution.id));
  await assert.rejects(service.share(bob, contribution.id, true));
  const privateDetail = await service.contributionDetail(
    alice,
    contribution.id,
  );
  assert.equal(privateDetail.contribution.consent, false);
  await assert.rejects(
    service.media(null, privateDetail.evidence.resultUploadId),
  );
  await assert.rejects(
    service.media(bob, privateDetail.evidence.resultUploadId),
  );
  assert.ok(
    (await service.media(alice, privateDetail.evidence.resultUploadId)).length,
  );
  await assert.rejects(service.share(alice, contribution.id, true));
  await Promise.all(
    Array.from({ length: 8 }, () =>
      service.processAssessment(alice, contribution.id),
    ),
  );
  const assessed = await service.contributionDetail(alice, contribution.id);
  assert.equal(assessed.assessment?.outcome, "supported");
  assert.equal(assessed.points, 50);
  await service.processAssessment(alice, contribution.id);
  const db = await getDb();
  const ledger = await db
    .select()
    .from(schema.rewards)
    .where(eq(schema.rewards.contributionId, contribution.id));
  assert.equal(ledger.length, 1);
  assert.ok(!(await service.community()).some((p) => p.id === contribution.id));
  await service.share(alice, contribution.id, true);
  assert.ok((await service.community()).some((p) => p.id === contribution.id));
  assert.ok(
    (await service.media(null, assessed.evidence.resultUploadId)).length,
  );
  await service.share(alice, contribution.id, false);
  assert.ok(!(await service.community()).some((p) => p.id === contribution.id));
  await assert.rejects(service.media(null, assessed.evidence.resultUploadId));
  const progress = await service.progress(alice);
  const rewards = await db
    .select()
    .from(schema.rewards)
    .where(eq(schema.rewards.ownerId, alice.id));
  assert.equal(
    progress.points,
    rewards.reduce((n, r) => n + r.amount, 0),
  );
  await assert.rejects(contribute(c.id));
});
test("all mock outcomes and failed-provider recovery use saved evidence", async () => {
  for (const scenario of [
    "needs_more_evidence",
    "not_supported",
    "failure_once",
    "failure",
  ]) {
    const c = await challenge();
    const row = await contribute(c.id, scenario);
    const result = await service.processAssessment(alice, row.id);
    assert.equal(result.points, 0);
    if (scenario.startsWith("failure")) {
      assert.equal(result.job.state, "failed");
      const db = await getDb();
      await db
        .update(schema.jobs)
        .set({ retryAt: new Date(0) })
        .where(eq(schema.jobs.id, result.job.id));
      const retry = await service.processAssessment(alice, row.id);
      assert.equal(retry.evidence.id, result.evidence.id);
      assert.equal(
        retry.job.state,
        scenario === "failure_once" ? "completed" : "failed",
      );
      assert.equal(retry.points, scenario === "failure_once" ? 50 : 0);
    } else {
      assert.equal(result.job.state, "completed");
      assert.equal(result.assessment?.outcome, scenario);
    }
  }
});
test("immutable evidence, requirement snapshot, one member/challenge and revisions", async () => {
  const c = await challenge();
  const first = await contribute(c.id, "needs_more_evidence");
  await service.processAssessment(alice, first.id);
  const db = await getDb();
  await db
    .update(schema.challenges)
    .set({ requirements: ["Changed challenge requirement"] })
    .where(eq(schema.challenges.id, c.id));
  const second = await contribute(c.id, "supported");
  assert.equal(first.id, second.id);
  assert.equal(second.version, 2);
  const versions = await db
    .select()
    .from(schema.evidence)
    .where(eq(schema.evidence.contributionId, first.id));
  assert.equal(versions.length, 2);
  assert.deepEqual(versions[0].requirements, ["Show the result."]);
  assert.deepEqual(versions[1].requirements, ["Changed challenge requirement"]);
  await service.processAssessment(alice, second.id);
  assert.equal((await service.contributionDetail(alice, second.id)).points, 50);
});
test("stale assessment cannot overwrite revised evidence or authorize an award", async () => {
  const c = await challenge();
  const first = await contribute(c.id);
  const original = mockProvider.assess;
  let release: () => void = () => {};
  let entered: () => void = () => {};
  const ready = new Promise<void>((r) => {
    entered = r;
  });
  const gate = new Promise<void>((r) => {
    release = r;
  });
  mockProvider.assess = async function (input, context) {
    entered();
    await gate;
    return original.call(mockProvider, input, context);
  };
  try {
    const processing = service.processAssessment(alice, first.id);
    await ready;
    const revision = await contribute(c.id, "not_supported");
    release();
    await processing;
    const current = await service.contributionDetail(alice, revision.id);
    assert.equal(current.evidence.version, 2);
    assert.equal(current.contribution.outcome, null);
    assert.equal(current.points, 0);
    mockProvider.assess = original;
    const final = await service.processAssessment(alice, revision.id);
    assert.equal(final.assessment?.outcome, "not_supported");
    assert.equal(final.points, 0);
  } finally {
    mockProvider.assess = original;
    release();
  }
});
test("deadline/closure checked at acceptance, duplicate finalization prevented", async () => {
  const c = await challenge();
  const id = await upload();
  await service.closeChallenge(creator, c.id);
  await assert.rejects(
    service.finalizeEvidence(alice, {
      challengeId: c.id,
      description: "x",
      resultUploadId: id,
    }),
  );
  await assert.rejects(service.closeChallenge(bob, c.id));
  const other = await challenge();
  const sharedUpload = await upload();
  const results = await Promise.allSettled(
    [1, 2].map(() =>
      service.finalizeEvidence(alice, {
        challengeId: other.id,
        description: "x",
        resultUploadId: sharedUpload,
        scenario: "supported",
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});
test("moderation authorization, public media hiding and owner deletion", async () => {
  const c = await challenge();
  const row = await contribute(c.id, "supported", alice, true);
  const detail = await service.processAssessment(alice, row.id);
  await service.report(bob, "contribution", row.id, "Private information");
  await assert.rejects(service.adminHide(bob, "contribution", row.id));
  const admin = await upsertMember("test:admin", "Admin", true);
  await service.adminHide(admin, "contribution", row.id);
  await assert.rejects(service.media(null, detail.evidence.resultUploadId));
  assert.ok(!(await service.community()).some((p) => p.id === row.id));
  await service.deleteContribution(alice, row.id);
  await assert.rejects(service.contributionDetail(alice, row.id));
  await assert.rejects(service.media(alice, detail.evidence.resultUploadId));
  await assert.rejects(contribute(c.id));
});
test("malformed or inconsistent provider output cannot authorize rewards", () => {
  assert.throws(() => validateProviderResult({ outcome: "supported" }, ["x"]));
  assert.throws(() =>
    validateProviderResult(
      {
        outcome: "supported",
        observations: ["x"],
        requirements: [
          { requirement: "x", status: "unclear", explanation: "x" },
        ],
        feedback: "x",
        nextStep: "x",
        provider: "x",
        simulated: true,
      },
      ["x"],
    ),
  );
});
test("database uniqueness prevents concurrent reward issuance even outside API", async () => {
  const c = await challenge();
  const row = await contribute(c.id);
  const detail = await service.processAssessment(alice, row.id);
  const db = await getDb();
  const [assessment] = await db
    .select()
    .from(schema.assessments)
    .where(eq(schema.assessments.evidenceId, detail.evidence.id));
  await Promise.all(
    Array.from({ length: 10 }, () =>
      db
        .insert(schema.rewards)
        .values({
          id: randomUUID(),
          contributionId: row.id,
          ownerId: alice.id,
          assessmentId: assessment.id,
          amount: 50,
        })
        .onConflictDoNothing(),
    ),
  );
  const [count] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.rewards)
    .where(eq(schema.rewards.contributionId, row.id));
  assert.equal(count.n, 1);
});
test("ordinary production clients cannot choose a reward-authorizing scenario", async () => {
  const c = await challenge();
  const photoId = await upload();
  const previous = process.env.NODE_ENV;
  const demo = process.env.DEMO_MODE;
  Object.assign(process.env, { NODE_ENV: "production" });
  delete process.env.DEMO_MODE;
  try {
    await assert.rejects(
      service.finalizeEvidence(alice, {
        challengeId: c.id,
        description: "x",
        resultUploadId: photoId,
        scenario: "supported",
      }),
      /Scenario selection is disabled/,
    );
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous });
    if (demo !== undefined) process.env.DEMO_MODE = demo;
  }
});
test("durable PostgreSQL records survive a new server process", async () => {
  const db = await getDb();
  const [before] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.rewards);
  assert.ok(before.count > 0);
  await closeDb();
  const probe =
    "import {PGlite} from '@electric-sql/pglite'; const pg=new PGlite(process.env.LOCAL_DATA_DIR+'/postgres'); await pg.waitReady; const result=await pg.query('select count(*)::int as count from rewards'); console.log(result.rows[0].count); await pg.close();";
  const result = await promisify(execFile)(
    process.execPath,
    ["--input-type=module", "--eval", probe],
    { cwd: process.cwd(), env: { ...process.env, LOCAL_DATA_DIR: folder } },
  );
  assert.equal(Number(result.stdout.trim()), before.count);
  await getDb();
});
test("creator review protects ownership, immutable versions and one-time rewards", async () => {
  const c = await challenge("Creator review action");
  await assert.rejects(contribute(c.id, "supported", creator), /cannot submit/);
  const row = await contribute(c.id, "needs_more_evidence");
  const initial = await service.contributionDetail(alice, row.id);
  await assert.rejects(
    service.reviewContribution(creator, row.id, {
      evidenceId: initial.evidence.id,
      decision: "approve",
      reason: "Checked evidence",
    }),
    /Wait for/,
  );
  await assert.rejects(service.creatorSubmissions(bob, c.id));
  await assert.rejects(service.contributionDetail(bob, row.id));
  await service.processAssessment(alice, row.id);
  const queue = await service.creatorSubmissions(creator, c.id);
  assert.equal(queue.submissions[0].assessment?.outcome, "needs_more_evidence");
  assert.ok(
    (await service.media(creator, initial.evidence.resultUploadId)).length,
  );
  await assert.rejects(
    service.reviewContribution(alice, row.id, {
      evidenceId: initial.evidence.id,
      decision: "approve",
      reason: "Self approve",
    }),
  );
  await assert.rejects(
    service.reviewContribution(creator, row.id, {
      evidenceId: randomUUID(),
      decision: "approve",
      reason: "Stale evidence",
    }),
    /Evidence changed/,
  );
  const outcomes = await Promise.allSettled(
    Array.from({ length: 3 }, () =>
      service.reviewContribution(creator, row.id, {
        evidenceId: initial.evidence.id,
        decision: "approve",
        reason: "Human review confirms requirements",
      }),
    ),
  );
  assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
  const approved = await service.contributionDetail(alice, row.id);
  assert.equal(approved.points, 50);
  assert.equal(approved.contribution.outcome, "supported");
  assert.equal(approved.assessment?.outcome, "needs_more_evidence");
  assert.equal(approved.review?.decision, "approve");
  await service.processAssessment(alice, row.id);
  assert.equal((await service.contributionDetail(alice, row.id)).points, 50);
  const secondChallenge = await challenge("Denied by creator");
  const second = await contribute(secondChallenge.id, "supported", alice, true);
  const assessed = await service.processAssessment(alice, second.id);
  assert.equal(assessed.points, 50);
  const denied = await service.reviewContribution(creator, second.id, {
    evidenceId: assessed.evidence.id,
    decision: "deny",
    reason: "Evidence does not satisfy our requirements",
  });
  assert.equal(denied.points, 0);
  assert.equal(denied.contribution.consent, false);
  assert.equal(denied.assessment?.outcome, "supported");
  assert.equal(denied.contribution.outcome, "not_supported");
  assert.ok(!(await service.community()).some((p) => p.id === second.id));
  const revision = await contribute(secondChallenge.id, "not_supported");
  await service.processAssessment(alice, revision.id);
  await assert.rejects(
    service.reviewContribution(creator, second.id, {
      evidenceId: assessed.evidence.id,
      decision: "approve",
      reason: "Old version",
    }),
    /Evidence changed/,
  );
});
test("variable rewards preserve accepted points through edits, denial and revision", async () => {
  const c = await challenge("Variable reward");
  await service.updateChallengeSettings(creator, c.id, {
    points: 125,
    fontFamily: "serif",
    fontSize: "large",
  });
  await assert.rejects(
    service.updateChallengeSettings(bob, c.id, {
      points: 999,
      fontFamily: "sans",
      fontSize: "small",
    }),
    /not owned/,
  );
  for (const points of [0, 1001, 1.5])
    await assert.rejects(
      service.updateChallengeSettings(creator, c.id, {
        points,
        fontFamily: "default",
        fontSize: "default",
      }),
    );
  const first = await contribute(c.id, "supported");
  await service.updateChallengeSettings(creator, c.id, {
    points: 250,
    fontFamily: "sans",
    fontSize: "small",
  });
  const assessed = await service.processAssessment(alice, first.id);
  assert.equal(assessed.points, 125);
  assert.equal(assessed.contribution.rewardPoints, 125);
  const denied = await service.reviewContribution(creator, first.id, {
    evidenceId: assessed.evidence.id,
    decision: "deny",
    reason: "Please revise the photo",
  });
  assert.equal(denied.points, 0);
  const revised = await contribute(c.id, "supported");
  assert.equal(
    (await service.processAssessment(alice, revised.id)).points,
    125,
  );
  const next = await contribute(c.id, "not_supported", bob);
  const feedback = await service.processAssessment(bob, next.id);
  const approved = await service.reviewContribution(creator, next.id, {
    evidenceId: feedback.evidence.id,
    decision: "approve",
    reason: "The mission is satisfied",
  });
  assert.equal(approved.points, 250);
  assert.equal((await service.processAssessment(bob, next.id)).points, 250);
  assert.equal((await service.challengeDetail(c.id)).fontFamily, "sans");
  assert.equal(
    (await service.discover()).find((row) => row.id === c.id)?.points,
    250,
  );
  // Re-running all local migrations must tolerate existing variable awards.
  await closeDb();
  assert.equal((await service.contributionDetail(bob, next.id)).points, 250);
});
