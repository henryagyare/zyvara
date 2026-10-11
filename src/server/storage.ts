import { mkdir, readFile, writeFile, unlink, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { bucket } from "./firebase";
import { dataDir } from "./config";
import { AppError } from "./errors";
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
export async function putObject(key: string, bytes: Buffer, mime: string) {
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
export async function readObject(key: string) {
  if (local()) return readFile(safePath(key));
  const [bytes] = await bucket().file(key).download();
  return bytes;
}
export async function readUploadObject(key: string) {
  const size = local()
    ? (await stat(safePath(key))).size
    : Number((await bucket().file(key).getMetadata())[0].size);
  if (!Number.isFinite(size) || size < 1 || size > MAX_PHOTO_BYTES)
    throw new AppError(400, "Choose a photo up to 10 MB.");
  return readObject(key);
}
export async function deleteObject(key: string) {
  if (local()) await unlink(safePath(key)).catch(() => {});
  else await bucket().file(key).delete({ ignoreNotFound: true });
}
export async function uploadDestination(key: string, mime: string) {
  if (local()) return null;
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
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
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
