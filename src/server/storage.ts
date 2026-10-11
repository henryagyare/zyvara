import { mkdir, readFile, writeFile, unlink, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { bucket } from "./firebase";
import { dataDir } from "./config";
import { AppError } from "./errors";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { mediaObjects } from "./schema";
type StorageDb = Pick<
  Awaited<ReturnType<typeof getDb>>,
  "select" | "insert" | "delete" | "execute"
>;
export const databaseStorage = () => process.env.STORAGE_MODE === "postgres";
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const local = () =>
  process.env.STORAGE_MODE === "local" ||
  (!process.env.FIREBASE_STORAGE_BUCKET &&
    process.env.NODE_ENV !== "production");
function safePath(key: string) {
  if (!/^(originals|derivatives)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(key))
    throw new Error("Invalid object key");
  return path.join(dataDir(), "media", key);
}
export async function putObject(
  key: string,
  bytes: Buffer,
  mime: string,
  transaction?: StorageDb,
) {
  safePath(key);
  if (databaseStorage()) {
    // Store sanitized copies only; raw originals never enter the database.
    const sanitized = key.startsWith("originals/")
      ? (await validatePhoto(bytes, mime)).derivative
      : bytes;
    if (sanitized.length > 1024 * 1024)
      throw new AppError(
        413,
        "This photo is too detailed. Choose a smaller photo.",
      );
    const save = async (tx: StorageDb) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(739183)`);
      const [usage] = await tx
        .select({ total: sql<number>`coalesce(sum(${mediaObjects.bytes}), 0)` })
        .from(mediaObjects);
      if (Number(usage.total) + sanitized.length > 100 * 1024 * 1024)
        throw new AppError(
          507,
          "Photo storage is full. Contact the organizer before uploading more photos.",
        );
      await tx
        .insert(mediaObjects)
        .values({
          key,
          encoded: sanitized.toString("base64"),
          bytes: sanitized.length,
          mime: "image/webp",
        });
    };
    if (transaction) await save(transaction);
    else await (await getDb()).transaction(save);
    return;
  }
  if (local()) {
    const file = safePath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes, { flag: "wx" });
  } else
    await bucket()
      .file(key)
      .save(bytes, {
        resumable: false,
        contentType: mime,
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: { cacheControl: "private, no-store" },
      });
}
export async function readObject(key: string, transaction?: StorageDb) {
  safePath(key);
  if (databaseStorage()) {
    const [row] = await (transaction || (await getDb()))
      .select()
      .from(mediaObjects)
      .where(eq(mediaObjects.key, key));
    if (!row) throw new AppError(404, "Stored photo is unavailable.");
    return Buffer.from(row.encoded, "base64");
  }
  if (local()) return readFile(safePath(key));
  const [bytes] = await bucket().file(key).download();
  return bytes;
}
export async function readUploadObject(key: string, transaction?: StorageDb) {
  if (databaseStorage()) return readObject(key, transaction);
  const size = local()
    ? (await stat(safePath(key))).size
    : Number((await bucket().file(key).getMetadata())[0].size);
  if (!Number.isFinite(size) || size < 1 || size > MAX_PHOTO_BYTES)
    throw new AppError(400, "Choose a photo up to 10 MB.");
  return readObject(key);
}
export async function deleteObject(key: string, transaction?: StorageDb) {
  safePath(key);
  if (databaseStorage()) {
    await (transaction || (await getDb()))
      .delete(mediaObjects)
      .where(eq(mediaObjects.key, key));
    return;
  }
  if (local()) await unlink(safePath(key)).catch(() => {});
  else await bucket().file(key).delete({ ignoreNotFound: true });
}
export async function uploadDestination(key: string, mime: string) {
  if (local() || databaseStorage()) return null;
  const [url] = await bucket()
    .file(key)
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 10 * 60 * 1000,
      contentType: mime,
      extensionHeaders: { "x-goog-if-generation-match": "0" },
    });
  return url;
}
export async function validatePhoto(bytes: Buffer, claimedType?: string) {
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES)
    throw new AppError(400, "Choose a photo up to 10 MB.");
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(bytes, {
      limitInputPixels: 40_000_000,
      failOn: "warning",
      animated: false,
    }).metadata();
  } catch {
    throw new AppError(
      400,
      "This file is not a decodable photo. Choose JPEG, PNG, or WebP.",
    );
  }
  const mime = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[
    metadata.format as "jpeg" | "png" | "webp"
  ];
  if (
    !mime ||
    (metadata.pages && metadata.pages > 1) ||
    !metadata.width ||
    !metadata.height
  )
    throw new AppError(400, "Choose a still JPEG, PNG, or WebP photo.");
  if (claimedType && claimedType !== mime)
    throw new AppError(
      400,
      "The file contents do not match the selected photo type.",
    );
  let derivative: Buffer;
  try {
    derivative = await sharp(bytes, {
      limitInputPixels: 40_000_000,
      failOn: "warning",
    })
      .rotate()
      .resize({
        width: 1280,
        height: 1280,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();
  } catch {
    throw new AppError(
      400,
      "This photo could not be decoded. Choose another photo.",
    );
  }
  return {
    mime,
    bytes: bytes.length,
    checksum: createHash("sha256").update(bytes).digest("hex"),
    derivative,
  };
}
