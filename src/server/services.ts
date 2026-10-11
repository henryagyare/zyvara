import { randomUUID } from "node:crypto";
import { and, eq, ilike, sql, desc, isNull } from "drizzle-orm";
import { getDb } from "./db";
import * as s from "./schema";
import { AppError } from "./errors";
import { challengeInput, contributionInput } from "./validation";
import {
  getAssessmentProvider,
  validateProviderResult,
  type Scenario,
} from "./assessment";
import { scenarioEnabled } from "./config";
import {
  readObject,
  readUploadObject,
  putObject,
  validatePhoto,
  deleteObject,
  uploadDestination,
} from "./storage";
import type { Member } from "./auth";
type Transaction = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]
>[0];
export async function rateLimit(key: string, limit = 30, seconds = 60) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - seconds * 1000);
  const [record] = await db
    .insert(s.rateLimits)
    .values({ key, count: 1, windowStart: new Date() })
    .onConflictDoUpdate({
      target: s.rateLimits.key,
      set: {
        count: sql`CASE WHEN ${s.rateLimits.windowStart} < ${cutoff} THEN 1 ELSE ${s.rateLimits.count}+1 END`,
        windowStart: sql`CASE WHEN ${s.rateLimits.windowStart} < ${cutoff} THEN now() ELSE ${s.rateLimits.windowStart} END`,
      },
    })
    .returning();
  if (record.count > limit)
    throw new AppError(
      429,
      "Too many requests. Please wait a minute and try again.",
    );
}
export async function discover(category?: string, query?: string) {
  const db = await getDb();
  return db
    .select({
      id: s.challenges.id,
      title: s.challenges.title,
      description: s.challenges.description,
      category: s.challenges.category,
      deadline: s.challenges.deadline,
      status: s.challenges.status,
      creator: s.users.name,
      createdAt: s.challenges.createdAt,
    })
    .from(s.challenges)
    .innerJoin(s.users, eq(s.challenges.creatorId, s.users.id))
    .where(
      and(
        eq(s.challenges.hidden, false),
        category ? eq(s.challenges.category, category) : undefined,
        query
          ? ilike(
              s.challenges.title,
              "%" + query.replace(/[%_\\]/g, "\\$&") + "%",
            )
          : undefined,
      ),
    )
    .orderBy(desc(s.challenges.createdAt))
    .limit(100);
}
export async function challengeDetail(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({ challenge: s.challenges, creator: s.users.name })
    .from(s.challenges)
    .innerJoin(s.users, eq(s.challenges.creatorId, s.users.id))
    .where(and(eq(s.challenges.id, id), eq(s.challenges.hidden, false)));
  if (!row) throw new AppError(404, "This challenge is unavailable.");
  const [count] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(s.contributions)
    .where(
      and(
        eq(s.contributions.challengeId, id),
        isNull(s.contributions.deletedAt),
      ),
    );
  return { ...row.challenge, creator: row.creator, participants: count.value };
}
export async function createChallenge(member: Member, input: unknown) {
  const value = challengeInput.parse(input);
  if (value.deadline && new Date(value.deadline) <= new Date())
    throw new AppError(400, "Choose a future deadline.", {
      deadline: "The deadline must be in the future.",
    });
  const db = await getDb();
  const [row] = await db
    .insert(s.challenges)
    .values({
      ...value,
      deadline: value.deadline ? new Date(value.deadline) : null,
      id: randomUUID(),
      creatorId: member.id,
    })
    .returning();
  return row;
}
export async function closeChallenge(member: Member, id: string) {
  const db = await getDb();
  const [row] = await db
    .update(s.challenges)
    .set({ status: "closed" })
    .where(
      and(
        eq(s.challenges.id, id),
        member.admin ? undefined : eq(s.challenges.creatorId, member.id),
      ),
    )
    .returning();
  if (!row) throw new AppError(404, "Challenge not found or not owned by you.");
  return row;
}
export async function allocateUpload(
  member: Member,
  role: string,
  mime: string,
) {
  if (
    !["result", "before"].includes(role) ||
    !["image/jpeg", "image/png", "image/webp"].includes(mime)
  )
    throw new AppError(
      400,
      "Choose JPEG, PNG, or WebP and a valid photo role.",
    );
  const db = await getDb();
  const id = randomUUID();
  const key = `originals/${member.id}/${id}`;
  const [upload] = await db
    .insert(s.uploads)
    .values({ id, ownerId: member.id, role, objectKey: key })
    .returning();
  const signedUrl = await uploadDestination(key, mime);
  return {
    id: upload.id,
    url: signedUrl || `/api/uploads/${id}/file`,
    direct: !!signedUrl,
    headers: signedUrl
      ? { "Content-Type": mime, "x-goog-if-generation-match": "0" }
      : { "Content-Type": mime },
  };
}
async function ownUpload(
  member: Member,
  id: string,
  tx: Transaction | Awaited<ReturnType<typeof getDb>>,
) {
  const [upload] = await tx
    .select()
    .from(s.uploads)
    .where(and(eq(s.uploads.id, id), eq(s.uploads.ownerId, member.id)));
  if (!upload) throw new AppError(404, "Photo not found.");
  return upload;
}
export async function receiveLocalUpload(
  member: Member,
  id: string,
  bytes: Buffer,
  mime: string,
) {
  if (
    process.env.STORAGE_MODE !== "local" &&
    (process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NODE_ENV === "production")
  )
    throw new AppError(400, "Use the direct private upload URL.");
  const db = await getDb();
  const upload = await ownUpload(member, id, db);
  if (upload.state !== "allocated")
    throw new AppError(409, "This upload has already been finalized.");
  await validatePhoto(bytes, mime);
  try {
    await putObject(upload.objectKey, bytes, mime);
  } catch {
    throw new AppError(
      409,
      "This upload slot has already been used. Choose the photo again.",
    );
  }
  return { id };
}
export async function finalizeUpload(member: Member, id: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM uploads WHERE id=${id} AND owner_id=${member.id} FOR UPDATE`,
    );
    const upload = await ownUpload(member, id, tx);
    if (upload.state === "ready") return { id };
    if (upload.state !== "allocated")
      throw new AppError(409, "This photo cannot be reused.");
    let bytes: Buffer;
    try {
      bytes = await readUploadObject(upload.objectKey);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        400,
        "Upload did not finish. Try uploading this photo again.",
      );
    }
    const verified = await validatePhoto(bytes);
    const derivativeKey = `derivatives/${member.id}/${id}.webp`;
    await putObject(derivativeKey, verified.derivative, "image/webp");
    await tx
      .update(s.uploads)
      .set({
        state: "ready",
        derivativeKey,
        mime: verified.mime,
        bytes: verified.bytes,
        checksum: verified.checksum,
      })
      .where(eq(s.uploads.id, id));
    return { id };
  });
}
export async function finalizeEvidence(member: Member, input: unknown) {
  const value = contributionInput.parse(input);
  if (value.scenario && !scenarioEnabled())
    throw new AppError(403, "Scenario selection is disabled.");
  const scenario = (value.scenario ||
    process.env.MOCK_SCENARIO ||
    "needs_more_evidence") as Scenario;
  if (
    ![
      "supported",
      "needs_more_evidence",
      "not_supported",
      "failure",
      "failure_once",
    ].includes(scenario)
  )
    throw new AppError(503, "The assessment fixture is not configured.");
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM challenges WHERE id=${value.challengeId} FOR UPDATE`,
    );
    const [challenge] = await tx
      .select()
      .from(s.challenges)
      .where(eq(s.challenges.id, value.challengeId));
    if (!challenge || challenge.hidden)
      throw new AppError(404, "This challenge is unavailable.");
    const acceptedAt = new Date();
    if (
      challenge.status !== "published" ||
      (challenge.deadline && challenge.deadline < acceptedAt)
    )
      throw new AppError(409, "This challenge is closed for submissions.");
    await tx
      .insert(s.contributions)
      .values({
        id: randomUUID(),
        ownerId: member.id,
        challengeId: challenge.id,
      })
      .onConflictDoNothing();
    const [contribution] = await tx
      .select()
      .from(s.contributions)
      .where(
        and(
          eq(s.contributions.ownerId, member.id),
          eq(s.contributions.challengeId, challenge.id),
        ),
      )
      .for("update");
    if (contribution.deletedAt)
      throw new AppError(
        409,
        "This contribution was deleted. Its participation record is retained to prevent repeated rewards.",
      );
    if (contribution.outcome === "supported")
      throw new AppError(
        409,
        "You have already earned recognition for this challenge.",
      );
    if (contribution.hidden)
      throw new AppError(
        409,
        "This contribution is hidden by an administrator.",
      );
    const ids = [
      value.resultUploadId,
      ...(value.beforeUploadId ? [value.beforeUploadId] : []),
    ].sort();
    for (const id of ids)
      await tx.execute(sql`SELECT id FROM uploads WHERE id=${id} FOR UPDATE`);
    const result = await ownUpload(member, value.resultUploadId, tx);
    const before = value.beforeUploadId
      ? await ownUpload(member, value.beforeUploadId, tx)
      : null;
    if (
      result.state !== "ready" ||
      result.role !== "result" ||
      (before && (before.state !== "ready" || before.role !== "before"))
    )
      throw new AppError(400, "Finish uploading each photo before submitting.");
    const version = contribution.latestVersion + 1;
    const evidenceId = randomUUID();
    const jobId = randomUUID();
    await tx.insert(s.evidence).values({
      id: evidenceId,
      contributionId: contribution.id,
      version,
      description: value.description,
      requirements: challenge.requirements,
      resultUploadId: result.id,
      beforeUploadId: before?.id,
      acceptedAt,
    });
    for (const id of ids)
      await tx
        .update(s.uploads)
        .set({ state: "used" })
        .where(eq(s.uploads.id, id));
    await tx
      .update(s.contributions)
      .set({
        latestVersion: version,
        outcome: null,
        consent: value.consent,
        consentAt: value.consent ? acceptedAt : null,
      })
      .where(eq(s.contributions.id, contribution.id));
    await tx.insert(s.jobs).values({ id: jobId, evidenceId, scenario });
    return { id: contribution.id, jobId, version };
  });
}
export async function ownContribution(member: Member, id: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(s.contributions)
    .where(
      and(
        eq(s.contributions.id, id),
        eq(s.contributions.ownerId, member.id),
        isNull(s.contributions.deletedAt),
      ),
    );
  if (!row) throw new AppError(404, "Contribution not found.");
  return row;
}
export async function contributionDetail(member: Member, id: string) {
  const contribution = await ownContribution(member, id);
  const db = await getDb();
  const [version] = await db
    .select()
    .from(s.evidence)
    .where(
      and(
        eq(s.evidence.contributionId, id),
        eq(s.evidence.version, contribution.latestVersion),
      ),
    );
  const [job] = await db
    .select()
    .from(s.jobs)
    .where(eq(s.jobs.evidenceId, version.id));
  const [assessment] = await db
    .select()
    .from(s.assessments)
    .where(eq(s.assessments.evidenceId, version.id))
    .orderBy(desc(s.assessments.createdAt))
    .limit(1);
  const [reward] = await db
    .select()
    .from(s.rewards)
    .where(eq(s.rewards.contributionId, id));
  const [challenge] = await db
    .select()
    .from(s.challenges)
    .where(eq(s.challenges.id, contribution.challengeId));
  return {
    contribution,
    evidence: version,
    job: {
      id: job.id,
      state: job.state,
      error: job.error,
      attempts: job.attempts,
      retryAt: job.retryAt,
      leaseUntil: job.leaseUntil,
    },
    assessment: assessment?.result || null,
    points: reward?.amount || 0,
    challenge,
  };
}
export async function processAssessment(member: Member, id: string) {
  await ownContribution(member, id);
  const db = await getDb();
  const claim = await db.transaction(async (tx) => {
    const [contribution] = await tx
      .select()
      .from(s.contributions)
      .where(eq(s.contributions.id, id))
      .for("update");
    if (contribution.deletedAt || contribution.hidden)
      throw new AppError(409, "Contribution is unavailable.");
    const [version] = await tx
      .select()
      .from(s.evidence)
      .where(
        and(
          eq(s.evidence.contributionId, id),
          eq(s.evidence.version, contribution.latestVersion),
        ),
      );
    const [job] = await tx
      .select()
      .from(s.jobs)
      .where(eq(s.jobs.evidenceId, version.id))
      .for("update");
    if (
      job.state === "completed" ||
      (job.state === "processing" &&
        job.leaseUntil &&
        job.leaseUntil > new Date())
    )
      return null;
    if (job.attempts >= 5)
      throw new AppError(
        409,
        "Retry limit reached. Submit revised evidence or contact the organizer.",
      );
    if (job.retryAt && job.retryAt > new Date())
      throw new AppError(429, "Please wait a moment before retrying.");
    const requestId = randomUUID();
    await tx
      .update(s.jobs)
      .set({
        state: "processing",
        attempts: job.attempts + 1,
        requestId,
        leaseUntil: new Date(Date.now() + 60_000),
        error: null,
      })
      .where(eq(s.jobs.id, job.id));
    return { version, job, requestId, attempt: job.attempts + 1 };
  });
  if (!claim) return contributionDetail(member, id);
  try {
    const load = async (uploadId: string) => {
      const [upload] = await db
        .select()
        .from(s.uploads)
        .where(eq(s.uploads.id, uploadId));
      if (!upload.derivativeKey)
        throw new Error("Stored photo is unavailable.");
      return {
        bytes: await readObject(upload.derivativeKey),
        mime: "image/webp" as const,
        checksum: upload.checksum!,
      };
    };
    const provider = getAssessmentProvider();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const raw = await Promise.race([
      provider.assess(
        {
          requirements: claim.version.requirements,
          description: claim.version.description,
          resultImage: await load(claim.version.resultUploadId),
          beforeImage: claim.version.beforeUploadId
            ? await load(claim.version.beforeUploadId)
            : undefined,
          evidenceVersion: claim.version.version,
          requestId: claim.requestId,
        },
        { scenario: claim.job.scenario as Scenario, attempt: claim.attempt },
      ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Assessment timed out. Retry using your saved evidence.",
              ),
            ),
          25_000,
        );
      }),
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });
    const result = validateProviderResult(raw, claim.version.requirements);
    await db.transaction(async (tx) => {
      const [contribution] = await tx
        .select()
        .from(s.contributions)
        .where(eq(s.contributions.id, id))
        .for("update");
      const [job] = await tx
        .select()
        .from(s.jobs)
        .where(eq(s.jobs.id, claim.job.id))
        .for("update");
      if (job.requestId !== claim.requestId || job.state !== "processing")
        return;
      const assessmentId = randomUUID();
      await tx.insert(s.assessments).values({
        id: assessmentId,
        evidenceId: claim.version.id,
        requestId: claim.requestId,
        result,
      });
      await tx
        .update(s.jobs)
        .set({ state: "completed", leaseUntil: null, error: null })
        .where(eq(s.jobs.id, job.id));
      if (
        contribution.latestVersion !== claim.version.version ||
        contribution.deletedAt ||
        contribution.hidden
      )
        return;
      await tx
        .update(s.contributions)
        .set({ outcome: result.outcome })
        .where(eq(s.contributions.id, id));
      if (result.outcome === "supported")
        await tx
          .insert(s.rewards)
          .values({
            id: randomUUID(),
            contributionId: id,
            ownerId: member.id,
            assessmentId,
            amount: 50,
          })
          .onConflictDoNothing({ target: s.rewards.contributionId });
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Simulated")
        ? error.message
        : "Assessment is temporarily unavailable. Your evidence is saved; retry without uploading again.";
    await db
      .update(s.jobs)
      .set({
        state: "failed",
        error: message,
        leaseUntil: null,
        retryAt: new Date(Date.now() + 2000),
      })
      .where(
        and(
          eq(s.jobs.id, claim.job.id),
          eq(s.jobs.requestId, claim.requestId),
          eq(s.jobs.state, "processing"),
        ),
      );
  }
  return contributionDetail(member, id);
}
export async function progress(member: Member) {
  const db = await getDb();
  const rows = await db
    .select({ contribution: s.contributions, challenge: s.challenges })
    .from(s.contributions)
    .innerJoin(s.challenges, eq(s.contributions.challengeId, s.challenges.id))
    .where(
      and(
        eq(s.contributions.ownerId, member.id),
        isNull(s.contributions.deletedAt),
      ),
    )
    .orderBy(desc(s.contributions.createdAt));
  const ledger = await db
    .select()
    .from(s.rewards)
    .where(eq(s.rewards.ownerId, member.id));
  return {
    points: ledger.reduce((n, r) => n + r.amount, 0),
    supported: rows.filter((r) => r.contribution.outcome === "supported")
      .length,
    categories: [
      ...new Set(
        rows
          .filter((r) => r.contribution.outcome === "supported")
          .map((r) => r.challenge.category),
      ),
    ],
    history: await Promise.all(
      rows.map(async (row) => ({
        ...(await contributionDetail(member, row.contribution.id)),
      })),
    ),
    rewardCount: ledger.length,
  };
}
export async function share(member: Member, id: string, consent: boolean) {
  await ownContribution(member, id);
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(s.contributions)
      .where(eq(s.contributions.id, id))
      .for("update");
    if (consent && (row.outcome !== "supported" || row.hidden || row.deletedAt))
      throw new AppError(
        409,
        "Only a supported, visible contribution can be shared.",
      );
    await tx
      .update(s.contributions)
      .set({ consent, consentAt: consent ? new Date() : null })
      .where(eq(s.contributions.id, id));
    return { consent };
  });
}
export async function community() {
  const db = await getDb();
  const rows = await db
    .select({
      contribution: s.contributions,
      challenge: s.challenges,
      author: s.users.name,
      evidence: s.evidence,
      result: s.assessments.result,
    })
    .from(s.contributions)
    .innerJoin(s.challenges, eq(s.contributions.challengeId, s.challenges.id))
    .innerJoin(s.users, eq(s.contributions.ownerId, s.users.id))
    .innerJoin(
      s.evidence,
      and(
        eq(s.evidence.contributionId, s.contributions.id),
        eq(s.evidence.version, s.contributions.latestVersion),
      ),
    )
    .innerJoin(s.assessments, eq(s.assessments.evidenceId, s.evidence.id))
    .where(
      and(
        eq(s.contributions.outcome, "supported"),
        eq(s.contributions.consent, true),
        eq(s.contributions.hidden, false),
        eq(s.challenges.hidden, false),
        isNull(s.contributions.deletedAt),
      ),
    )
    .orderBy(desc(s.contributions.consentAt))
    .limit(100);
  return rows.map((r) => ({
    id: r.contribution.id,
    title: r.challenge.title,
    challengeId: r.challenge.id,
    author: r.author,
    description: r.evidence.description,
    category: r.challenge.category,
    resultUploadId: r.evidence.resultUploadId,
    beforeUploadId: r.evidence.beforeUploadId,
    createdAt: r.contribution.consentAt,
    simulated: r.result.simulated,
  }));
}
export async function media(member: Member | null, uploadId: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      upload: s.uploads,
      evidence: s.evidence,
      contribution: s.contributions,
      challenge: s.challenges,
    })
    .from(s.uploads)
    .innerJoin(
      s.evidence,
      sql`${s.evidence.resultUploadId}=${s.uploads.id} OR ${s.evidence.beforeUploadId}=${s.uploads.id}`,
    )
    .innerJoin(
      s.contributions,
      eq(s.evidence.contributionId, s.contributions.id),
    )
    .innerJoin(s.challenges, eq(s.contributions.challengeId, s.challenges.id))
    .where(eq(s.uploads.id, uploadId));
  if (
    !row ||
    row.contribution.deletedAt ||
    row.upload.state === "deleted" ||
    row.contribution.hidden ||
    row.challenge.hidden
  )
    throw new AppError(404, "Photo unavailable.");
  const owned = member?.id === row.contribution.ownerId;
  const publicAllowed =
    row.contribution.consent &&
    row.contribution.outcome === "supported" &&
    row.evidence.version === row.contribution.latestVersion;
  if (!owned && !publicAllowed) throw new AppError(404, "Photo unavailable.");
  if (!row.upload.derivativeKey) throw new AppError(404, "Photo unavailable.");
  return readObject(row.upload.derivativeKey);
}
export async function deleteContribution(member: Member, id: string) {
  await ownContribution(member, id);
  const db = await getDb();
  const keys = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM contributions WHERE id=${id} FOR UPDATE`,
    );
    await tx
      .update(s.contributions)
      .set({ deletedAt: new Date(), consent: false, consentAt: null })
      .where(eq(s.contributions.id, id));
    const versions = await tx
      .select()
      .from(s.evidence)
      .where(eq(s.evidence.contributionId, id));
    const keys: string[] = [];
    for (const version of versions) {
      await tx
        .update(s.evidence)
        .set({ description: "[deleted]" })
        .where(eq(s.evidence.id, version.id));
      for (const uploadId of [
        version.resultUploadId,
        version.beforeUploadId,
      ].filter(Boolean) as string[]) {
        const [upload] = await tx
          .select()
          .from(s.uploads)
          .where(eq(s.uploads.id, uploadId));
        keys.push(
          upload.objectKey,
          ...(upload.derivativeKey ? [upload.derivativeKey] : []),
        );
        await tx
          .update(s.uploads)
          .set({ state: "deleted" })
          .where(eq(s.uploads.id, uploadId));
      }
    }
    return keys;
  });
  for (const key of keys) await deleteObject(key);
  return { deleted: true };
}
export async function report(
  member: Member,
  targetType: string,
  targetId: string,
  reason: string,
) {
  if (
    !["challenge", "contribution"].includes(targetType) ||
    !reason.trim() ||
    reason.length > 1000
  )
    throw new AppError(400, "Enter a report reason of 1–1,000 characters.");
  if (targetType === "challenge") await challengeDetail(targetId);
  else if (!(await community()).some((p) => p.id === targetId))
    throw new AppError(404, "Contribution unavailable.");
  const db = await getDb();
  await db.insert(s.reports).values({
    id: randomUUID(),
    reporterId: member.id,
    targetType,
    targetId,
    reason: reason.trim(),
  });
  return { reported: true };
}
export async function adminHide(
  member: Member,
  targetType: string,
  targetId: string,
) {
  if (!member.admin) throw new AppError(403, "Administrator access required.");
  if (!["challenge", "contribution"].includes(targetType))
    throw new AppError(400, "Invalid target.");
  const db = await getDb();
  await db.transaction(async (tx) => {
    const table = targetType === "challenge" ? s.challenges : s.contributions;
    const rows = await tx
      .update(table)
      .set({ hidden: true })
      .where(eq(table.id, targetId))
      .returning({ id: table.id });
    if (!rows.length) throw new AppError(404, "Target unavailable.");
    await tx.insert(s.adminActions).values({
      id: randomUUID(),
      adminId: member.id,
      targetId,
      targetType,
      action: "hide",
    });
  });
  return { hidden: true };
}
