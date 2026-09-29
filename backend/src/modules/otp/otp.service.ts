import { env } from "../../config/env.js";
import { hmacSha256Hex, numericCode, safeEqual } from "../../lib/crypto.js";
import { AppError, badRequest, tooMany } from "../../lib/errors.js";
import { Otp, type OtpPurpose } from "./otp.model.js";

const RESEND_COOLDOWN_MS = 30_000;
/** How long a verified (but not yet used) email proof stays valid. */
const PROOF_WINDOW_MS = 30 * 60_000;

function hashCode(purpose: OtpPurpose, email: string, code: string): string {
  return hmacSha256Hex(env.JWT_ACCESS_SECRET, `${purpose}:${email.toLowerCase()}:${code}`);
}

/** Creates (or replaces) the active code for purpose+email and returns it for delivery. */
export async function issueOtp(purpose: OtpPurpose, email: string, length = 6): Promise<string> {
  const normalized = email.toLowerCase();
  const existing = await Otp.findOne({ purpose, email: normalized }).lean();
  if (existing && Date.now() - existing.updatedAt.getTime() < RESEND_COOLDOWN_MS) {
    throw tooMany("Please wait a few seconds before requesting another code.");
  }
  const code = numericCode(length);
  await Otp.findOneAndUpdate(
    { purpose, email: normalized },
    {
      $set: { codeHash: hashCode(purpose, normalized, code), attempts: 0, expiresAt: new Date(Date.now() + env.OTP_TTL_MINUTES * 60_000) },
      $unset: { verifiedAt: 1, consumedAt: 1 },
    },
    { upsert: true },
  );
  return code;
}

const invalidCode = () => new AppError(400, "INVALID_OTP", "That code is incorrect or has expired.", { code: "Invalid code" });

/**
 * Checks a code. With `consume` the code is single-use and cannot be reused;
 * otherwise it is marked verified so a follow-up request can prove ownership
 * of the email (see `consumeVerifiedEmail`).
 */
export async function verifyOtp(purpose: OtpPurpose, email: string, code: string, { consume }: { consume: boolean }): Promise<void> {
  const normalized = email.toLowerCase();
  // Atomically count the attempt first so parallel guesses can't exceed the limit.
  const otp = await Otp.findOneAndUpdate(
    { purpose, email: normalized, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  );
  if (!otp) throw invalidCode();
  if (otp.attempts > env.OTP_MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otp._id });
    throw new AppError(429, "OTP_LOCKED", "Too many incorrect attempts. Please request a new code.");
  }
  if (!safeEqual(otp.codeHash, hashCode(purpose, normalized, code))) throw invalidCode();

  const now = new Date();
  if (consume) {
    await Otp.deleteOne({ _id: otp._id });
  } else {
    await Otp.updateOne({ _id: otp._id }, { $set: { verifiedAt: now, expiresAt: new Date(now.getTime() + PROOF_WINDOW_MS) } });
  }
}

/** Requires that `email` was verified for `purpose` recently, and uses up that proof. */
export async function consumeVerifiedEmail(purpose: OtpPurpose, email: string): Promise<void> {
  const res = await Otp.findOneAndUpdate(
    { purpose, email: email.toLowerCase(), verifiedAt: { $exists: true }, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { $set: { consumedAt: new Date() } },
  );
  if (!res) throw badRequest("Please verify your email address first.", { email: "Email not verified" }, "EMAIL_NOT_VERIFIED");
}
