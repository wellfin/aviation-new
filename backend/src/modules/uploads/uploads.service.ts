import { randomBytes } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import type { Types } from "mongoose";
import { env } from "../../config/env.js";
import { AppError, notFound, validationError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { type Paginated, paginated, skipFor } from "../../lib/pagination.js";
import { hasPermission, type Role } from "../rbac/permissions.js";
import { getStorage, STORAGE_KEY_PATTERN } from "./storage.js";
import { toUploadDTO, Upload, type UploadDoc, type UploadDTO, type UploadKind } from "./upload.model.js";

/** Per-user cap on stored files (prevents disk abuse by a single account). */
export const MAX_UPLOADS_PER_USER = 200;

/** Allowed formats per kind, keyed by the extension file-type reports. SVG/HTML are never accepted. */
const ALLOWED: Record<UploadKind, Readonly<Record<string, string>>> = {
  image: { png: "image/png", jpg: "image/jpeg", webp: "image/webp" },
  document: { pdf: "application/pdf" },
};

const MB = 1024 * 1024;

export function maxBytesFor(kind: UploadKind): number {
  return Math.floor((kind === "image" ? env.UPLOAD_MAX_IMAGE_MB : env.UPLOAD_MAX_DOCUMENT_MB) * MB);
}

/** Upper bound for the multipart parser before we know the kind. */
export function maxUploadBytes(): number {
  return Math.max(maxBytesFor("image"), maxBytesFor("document"));
}

export function publicFileUrl(key: string): string {
  return `${env.PUBLIC_API_URL.replace(/\/+$/, "")}/api/v1/files/${key}`;
}

/** Keeps only a harmless display name: no paths, control chars, quotes or markup. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .normalize("NFKC")
    .replace(/[^\w.\- ()]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[.\s]+/, "")
    .trim();
  return cleaned.slice(-150);
}

function newKey(ext: string, now = new Date()): string {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}/${mm}/${randomBytes(16).toString("hex")}.${ext}`;
}

export interface IncomingFile {
  buffer: Buffer;
  originalname: string;
}

export async function createUpload(ownerId: Types.ObjectId, kind: UploadKind, file: IncomingFile): Promise<UploadDTO> {
  if (file.buffer.length === 0) throw validationError({ file: "The file is empty." });
  const limit = maxBytesFor(kind);
  if (file.buffer.length > limit) {
    throw new AppError(413, "INVALID_UPLOAD", `That file is too large (max ${Math.round(limit / MB)} MB).`);
  }

  // Trust only the magic bytes — never the client's mimetype or file extension.
  const detected = await fileTypeFromBuffer(file.buffer);
  const mime = detected ? ALLOWED[kind][detected.ext] : undefined;
  if (!detected || !mime) {
    const allowed = Object.keys(ALLOWED[kind]).join(", ").toUpperCase();
    throw validationError({ file: `Unsupported file type. Allowed: ${allowed}.` });
  }

  const count = await Upload.countDocuments({ owner: ownerId });
  if (count >= MAX_UPLOADS_PER_USER) {
    throw new AppError(403, "UPLOAD_QUOTA_EXCEEDED", `You can store at most ${MAX_UPLOADS_PER_USER} files. Delete some to upload more.`);
  }

  const key = newKey(detected.ext);
  const storage = getStorage();
  await storage.put(key, file.buffer);
  try {
    const doc = await Upload.create({
      owner: ownerId,
      key,
      url: publicFileUrl(key),
      kind,
      mime,
      size: file.buffer.length,
      originalName: sanitizeFileName(file.originalname),
    });
    return toUploadDTO(doc);
  } catch (err) {
    // Don't leave orphaned bytes behind when the metadata write fails.
    await storage.remove(key).catch((e: unknown) => logger.warn({ err: e, key }, "Failed to remove orphaned upload"));
    throw err;
  }
}

export async function listUploads(
  ownerId: Types.ObjectId,
  q: { page: number; pageSize: number; kind?: UploadKind | undefined },
): Promise<Paginated<UploadDTO>> {
  const filter: Record<string, unknown> = { owner: ownerId };
  if (q.kind) filter.kind = q.kind;
  const [items, total] = await Promise.all([
    Upload.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(q.page, q.pageSize)).limit(q.pageSize),
    Upload.countDocuments(filter),
  ]);
  return paginated(items.map(toUploadDTO), total, q.page, q.pageSize);
}

/** Owners may delete their files; staff (listing moderators) may delete any. Everyone else gets a 404. */
export async function deleteUpload(id: string, actor: { _id: Types.ObjectId; role: Role }): Promise<void> {
  const isStaff = hasPermission(actor.role, "providers:manage");
  const doc = await Upload.findOneAndDelete(isStaff ? { _id: id } : { _id: id, owner: actor._id });
  if (!doc) throw notFound("Upload");
  await getStorage()
    .remove(doc.key)
    .catch((err: unknown) => logger.warn({ err, key: doc.key }, "Failed to remove stored file"));
}

export async function findUploadByKey(key: string): Promise<UploadDoc | null> {
  if (!STORAGE_KEY_PATTERN.test(key)) return null;
  return Upload.findOne({ key });
}
