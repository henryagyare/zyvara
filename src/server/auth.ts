import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { users } from "./schema";
import { AppError } from "./errors";
import { demoEnabled, dataDir } from "./config";
import { adminAuth } from "./firebase";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
export type Member = typeof users.$inferSelect;
const COOKIE = "zyvara_session";
export function secureEqual(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}
async function secret() {
  if (process.env.SESSION_SECRET) {
    if (process.env.SESSION_SECRET.length < 32)
      throw new Error("SESSION_SECRET must contain at least 32 characters");
    return new TextEncoder().encode(process.env.SESSION_SECRET);
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("SESSION_SECRET is required for production demo sessions");
  await mkdir(dataDir(), { recursive: true });
  const file = path.join(dataDir(), "session-key");
  try {
    return new Uint8Array(await readFile(file));
  } catch {
    const bytes = randomBytes(48);
    await writeFile(file, bytes, { flag: "wx" }).catch(() => {});
    return new Uint8Array(await readFile(file));
  }
}
export async function upsertMember(
  subject: string,
  name: string,
  admin = false,
) {
  const db = await getDb();
  const [member] = await db
    .insert(users)
    .values({ id: randomUUID(), subject, name, admin })
    .onConflictDoUpdate({ target: users.subject, set: { name, admin } })
    .returning();
  return member;
}
export async function currentMember(): Promise<Member | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  try {
    let subject: string;
    let name: string;
    let admin = false;
    if (demoEnabled()) {
      const { payload } = await jwtVerify(value, await secret(), {
        issuer: "zyvara-demo",
        audience: "zyvara",
      });
      if (typeof payload.sub !== "string" || !payload.sub.startsWith("demo:"))
        return null;
      subject = payload.sub;
      name = String(payload.name || "Demo member");
    } else {
      const token = await adminAuth().verifySessionCookie(value, true);
      subject = token.uid;
      name = token.name || "Zyvara member";
      admin = (process.env.ADMIN_FIREBASE_UIDS || "")
        .split(",")
        .includes(token.uid);
    }
    const db = await getDb();
    const [member] = await db
      .select()
      .from(users)
      .where(eq(users.subject, subject));
    if (member && member.admin === admin && member.name === name) return member;
    return upsertMember(subject, name, admin);
  } catch {
    return null;
  }
}
export async function requireMember() {
  const member = await currentMember();
  if (!member) throw new AppError(401, "Sign in to continue.");
  return member;
}
export async function createSession(input: {
  idToken?: string;
  accessCode?: string;
  name?: string;
}) {
  let value: string;
  if (demoEnabled()) {
    if (
      !process.env.DEMO_ACCESS_CODE ||
      !input.accessCode ||
      !secureEqual(input.accessCode, process.env.DEMO_ACCESS_CODE)
    )
      throw new AppError(401, "The demo access code is incorrect.");
    const name = input.name?.trim();
    if (!name || name.length > 80)
      throw new AppError(400, "Enter a demo name of 1–80 characters.");
    const subject =
      "demo:" + createHash("sha256").update(name.toLowerCase()).digest("hex");
    await upsertMember(subject, name);
    value = await new SignJWT({ name })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(subject)
      .setIssuer("zyvara-demo")
      .setAudience("zyvara")
      .setIssuedAt()
      .setExpirationTime("5d")
      .sign(await secret());
  } else {
    if (!input.idToken)
      throw new AppError(400, "A Google sign-in token is required.");
    const decoded = await adminAuth().verifyIdToken(input.idToken, true);
    if (Date.now() / 1000 - decoded.auth_time > 300)
      throw new AppError(401, "Please sign in again to start a fresh session.");
    await upsertMember(
      decoded.uid,
      decoded.name || "Zyvara member",
      (process.env.ADMIN_FIREBASE_UIDS || "").split(",").includes(decoded.uid),
    );
    value = await adminAuth().createSessionCookie(input.idToken, {
      expiresIn: 5 * 24 * 60 * 60 * 1000,
    });
  }
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 5 * 24 * 60 * 60,
    path: "/",
  });
  return requireMember();
}
export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}
