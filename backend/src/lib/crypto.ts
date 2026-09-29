import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";

/** Argon2id with OWASP-recommended parameters. */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** Opaque high-entropy token (URL safe). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Fast one-way hash for high-entropy secrets we only need to look up (refresh tokens, links). */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Numeric one-time code of `length` digits, uniformly random. */
export function numericCode(length: number): string {
  return Array.from({ length }, () => randomInt(0, 10)).join("");
}

export function hmacSha256Hex(secret: string, payload: string | Buffer): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
