import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { env } from "../../config/env.js";

/**
 * Keys are generated server-side only: `<yyyy>/<mm>/<32 hex>.<ext>`.
 * Anything else is rejected before it can touch the filesystem.
 */
export const STORAGE_KEY_PATTERN = /^\d{4}\/(0[1-9]|1[0-2])\/[a-f0-9]{32}\.(png|jpg|webp|pdf)$/;

export interface StoredObject {
  stream: Readable;
  size: number;
}

/** Minimal blob-store contract so local disk can be swapped for S3 (or similar) later. */
export interface Storage {
  put(key: string, data: Buffer): Promise<void>;
  /** Returns null when the object does not exist. */
  open(key: string): Promise<StoredObject | null>;
  /** Idempotent: removing a missing object is not an error. */
  remove(key: string): Promise<void>;
}

function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ENOENT";
}

export class LocalDiskStorage implements Storage {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  /** Resolves a key to an absolute path, guaranteeing it stays inside the root directory. */
  private pathFor(key: string): string {
    if (!STORAGE_KEY_PATTERN.test(key)) throw new Error("Invalid storage key");
    const full = path.resolve(this.root, key);
    const rel = path.relative(this.root, full);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("Storage key escapes the upload directory");
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const file = this.pathFor(key);
    await mkdir(path.dirname(file), { recursive: true });
    // "wx": never overwrite an existing object.
    await writeFile(file, data, { flag: "wx", mode: 0o640 });
  }

  async open(key: string): Promise<StoredObject | null> {
    const file = this.pathFor(key);
    try {
      const info = await stat(file);
      if (!info.isFile()) return null;
      return { stream: createReadStream(file), size: info.size };
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(this.pathFor(key));
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
  }
}

let storage: Storage = new LocalDiskStorage(env.UPLOAD_DIR);

export function getStorage(): Storage {
  return storage;
}

/** Replaces the storage backend (e.g. an S3 implementation at boot). */
export function setStorage(next: Storage): void {
  storage = next;
}
