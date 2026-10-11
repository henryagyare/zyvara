import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  currentMember,
  requireMember,
  createSession,
  deleteSession,
} from "@/server/auth";
import { demoEnabled, scenarioEnabled, productionReady } from "@/server/config";
import { AppError } from "@/server/errors";
import { seed } from "@/server/seed";
import { getAssessmentProvider } from "@/server/assessment";
import * as service from "@/server/services";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || request.nextUrl.origin;
  if (!origin || origin !== expected)
    throw new AppError(
      403,
      "This request must come from the Zyvara application.",
    );
}
async function json(request: NextRequest) {
  if (Number(request.headers.get("content-length") || 0) > 32_000)
    throw new AppError(413, "This request is too large.");
  const raw = await request.text();
  if (raw.length > 32_000)
    throw new AppError(413, "This request is too large.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError(400, "Please send a valid request.");
  }
}
async function dispatch(request: NextRequest, context: Context) {
  try {
    const { path } = await context.params;
    const route = path.join("/");
    const method = request.method;
    if (method !== "GET") sameOrigin(request);
    if (method === "GET" && route === "config")
      return NextResponse.json({
        demo: demoEnabled(),
        scenarioSelection:
          scenarioEnabled() && getAssessmentProvider().simulated,
        firebaseConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        simulatedAssessment: getAssessmentProvider().simulated,
        productionReady: productionReady(),
        database: process.env.DATABASE_URL
          ? "PostgreSQL"
          : "Local development PostgreSQL",
        storage:
          process.env.STORAGE_MODE === "postgres"
            ? "PostgreSQL private photos"
            : process.env.FIREBASE_STORAGE_BUCKET &&
                process.env.STORAGE_MODE !== "local"
              ? "Firebase private storage"
              : "Local development private storage",
      });
    if (method === "GET" && route === "session")
      return NextResponse.json({ member: await currentMember() });
    if (method === "POST" && route === "session") {
      await service.rateLimit(
        "signin:" + request.headers.get("x-forwarded-for")?.split(",")[0],
        10,
      );
      return NextResponse.json({
        member: await createSession(
          z
            .object({
              idToken: z.string().min(1).max(16000).optional(),
              accessCode: z.string().min(1).max(200).optional(),
              name: z.string().trim().min(1).max(80).optional(),
            })
            .parse(await json(request)),
        ),
      });
    }
    if (method === "DELETE" && route === "session") {
      await deleteSession();
      return NextResponse.json({ signedOut: true });
    }
    if (method === "GET" && route === "health") {
      const { getDb } = await import("@/server/db");
      const { sql } = await import("drizzle-orm");
      await (await getDb()).execute(sql`SELECT 1`);
      return NextResponse.json({
        ok: true,
        productionReady: productionReady(),
      });
    }
    if (method === "GET" && route === "challenges") {
      if (!process.env.DATABASE_URL) await seed();
      return NextResponse.json({
        challenges: await service.discover(
          request.nextUrl.searchParams.get("category") || undefined,
          request.nextUrl.searchParams.get("q")?.slice(0, 80) || undefined,
        ),
      });
    }
    if (method === "GET" && path[0] === "challenges" && path.length === 2)
      return NextResponse.json(await service.challengeDetail(path[1]));
    if (method === "GET" && route === "community")
      return NextResponse.json({ posts: await service.community() });
    if (method === "GET" && path[0] === "media" && path.length === 2) {
      const bytes = await service.media(await currentMember(), path[1]);
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private, no-store, max-age=0",
          "Content-Disposition": "inline",
        },
      });
    }
    const member = await requireMember();
    if (method !== "GET")
      await service.rateLimit(
        member.id + ":" + path[0],
        path[0] === "uploads" ? 60 : 30,
      );
    if (method === "POST" && route === "challenges")
      return NextResponse.json(
        await service.createChallenge(member, await json(request)),
        { status: 201 },
      );
    if (
      method === "PATCH" &&
      path[0] === "challenges" &&
      path[2] === "settings" &&
      path.length === 3
    )
      return NextResponse.json(
        await service.updateChallengeSettings(
          member,
          path[1],
          await json(request),
        ),
      );
    if (
      method === "POST" &&
      path[0] === "challenges" &&
      path[2] === "close" &&
      path.length === 3
    )
      return NextResponse.json(await service.closeChallenge(member, path[1]));
    if (
      method === "GET" &&
      path[0] === "challenges" &&
      path[2] === "submissions" &&
      path.length === 3
    )
      return NextResponse.json(
        await service.creatorSubmissions(member, path[1]),
      );
    if (
      method === "POST" &&
      path[0] === "contributions" &&
      path[2] === "review" &&
      path.length === 3
    )
      return NextResponse.json(
        await service.reviewContribution(
          member,
          path[1],
          z
            .object({
              evidenceId: z.string().uuid(),
              decision: z.enum(["approve", "deny"]),
              reason: z.string().trim().min(1).max(2000),
            })
            .parse(await json(request)),
        ),
      );
    if (method === "POST" && route === "uploads") {
      const body = z
        .object({
          role: z.enum(["result", "before"]),
          mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
        })
        .parse(await json(request));
      return NextResponse.json(
        await service.allocateUpload(member, body.role, body.mime),
        { status: 201 },
      );
    }
    if (
      method === "PUT" &&
      path[0] === "uploads" &&
      path[2] === "file" &&
      path.length === 3
    ) {
      if (Number(request.headers.get("content-length") || 0) > 10 * 1024 * 1024)
        throw new AppError(413, "Choose a photo up to 10 MB.");
      const reader = request.body?.getReader();
      if (!reader) throw new AppError(400, "A photo is required.");
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.length;
        if (length > 10 * 1024 * 1024) {
          await reader.cancel();
          throw new AppError(413, "Choose a photo up to 10 MB.");
        }
        chunks.push(chunk.value);
      }
      return NextResponse.json(
        await service.receiveLocalUpload(
          member,
          path[1],
          Buffer.concat(chunks),
          request.headers.get("content-type") || "",
        ),
      );
    }
    if (
      method === "POST" &&
      path[0] === "uploads" &&
      path[2] === "finalize" &&
      path.length === 3
    )
      return NextResponse.json(await service.finalizeUpload(member, path[1]));
    if (method === "POST" && route === "contributions")
      return NextResponse.json(
        await service.finalizeEvidence(member, await json(request)),
        { status: 201 },
      );
    if (method === "GET" && path[0] === "contributions" && path.length === 2)
      return NextResponse.json(
        await service.contributionDetail(member, path[1]),
      );
    if (
      method === "POST" &&
      path[0] === "contributions" &&
      path[2] === "assess" &&
      path.length === 3
    )
      return NextResponse.json(
        await service.processAssessment(member, path[1]),
      );
    if (
      method === "PUT" &&
      path[0] === "contributions" &&
      path[2] === "sharing" &&
      path.length === 3
    ) {
      const body = z
        .object({ consent: z.boolean() })
        .parse(await json(request));
      return NextResponse.json(
        await service.share(member, path[1], body.consent),
      );
    }
    if (method === "DELETE" && path[0] === "contributions" && path.length === 2)
      return NextResponse.json(
        await service.deleteContribution(member, path[1]),
      );
    if (method === "GET" && route === "progress")
      return NextResponse.json(await service.progress(member));
    if (method === "POST" && route === "reports") {
      const body = z
        .object({
          targetType: z.enum(["challenge", "contribution"]),
          targetId: z.string(),
          reason: z.string(),
        })
        .parse(await json(request));
      return NextResponse.json(
        await service.report(
          member,
          body.targetType,
          body.targetId,
          body.reason,
        ),
      );
    }
    if (method === "POST" && route === "admin/hide") {
      const body = z
        .object({
          targetType: z.enum(["challenge", "contribution"]),
          targetId: z.string(),
        })
        .parse(await json(request));
      return NextResponse.json(
        await service.adminHide(member, body.targetType, body.targetId),
      );
    }
    throw new AppError(404, "This endpoint is unavailable.");
  } catch (error) {
    if (error instanceof AppError)
      return NextResponse.json(
        { error: error.message, fields: error.fields },
        { status: error.status },
      );
    if (error instanceof z.ZodError) {
      const fields = Object.fromEntries(
        error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      return NextResponse.json(
        { error: "Review the highlighted fields and try again.", fields },
        { status: 400 },
      );
    }
    console.error(
      "Zyvara request failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return NextResponse.json(
      {
        error:
          "Zyvara is temporarily unavailable. Your saved records are safe. Please try again.",
      },
      { status: 503 },
    );
  }
}
export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
