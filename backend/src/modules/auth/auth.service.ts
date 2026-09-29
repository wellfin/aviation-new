import { env } from "../../config/env.js";
import { hashPassword, verifyPassword } from "../../lib/crypto.js";
import { withTransaction } from "../../lib/db.js";
import { AppError, conflict, unauthorized } from "../../lib/errors.js";
import { sendMail, sendMailInBackground } from "../notifications/mailer.js";
import { passwordChangedEmail, passwordResetEmail, verificationEmail } from "../notifications/templates.js";
import { issueOtp, verifyOtp } from "../otp/otp.service.js";
import { User, type UserDoc } from "../users/user.model.js";
import type { z } from "zod";
import type { changePasswordSchema, registerSchema, updateProfileSchema } from "./auth.schemas.js";
import { revokeAllForUser } from "./tokens.js";

// Hash used to keep login timing constant when the email does not exist.
const DUMMY_HASH_PROMISE = hashPassword("timing-equaliser-not-a-real-password-1");

const PROVIDER_SERVICES = new Set(["business", "charter", "airport"]);

export async function register(input: z.infer<typeof registerSchema>): Promise<{ email: string }> {
  const existing = await User.findOne({ email: input.email });
  if (existing?.emailVerifiedAt) {
    throw conflict("An account with this email already exists.", { email: "Email already registered" }, "EMAIL_TAKEN");
  }

  const isProvider = input.accountType === "provider" || (input.service !== undefined && PROVIDER_SERVICES.has(input.service));
  const fields = {
    firstName: input.firstName,
    lastName: input.lastName,
    passwordHash: await hashPassword(input.password),
    phone: input.phone || undefined,
    company: input.company || undefined,
    country: input.country?.toUpperCase(),
    service: input.service,
    intendedPlan: input.plan,
    role: isProvider ? ("PROVIDER" as const) : ("USER" as const),
  };

  // An unverified registration can be restarted (e.g. the user lost the code),
  // which replaces the pending details instead of leaking that the email exists.
  const user = existing ? Object.assign(existing, fields) : new User({ email: input.email, ...fields });
  await user.save();

  const code = await issueOtp("email_verification", user.email);
  await sendMail(verificationEmail(user.email, user.firstName, code));
  return { email: user.email };
}

export async function resendVerification(email: string): Promise<void> {
  const user = await User.findOne({ email });
  // Always succeeds from the caller's point of view (no account enumeration).
  if (!user || user.emailVerifiedAt) return;
  const code = await issueOtp("email_verification", user.email);
  await sendMail(verificationEmail(user.email, user.firstName, code));
}

export async function verifyEmail(email: string, code: string): Promise<UserDoc> {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(400, "INVALID_OTP", "That code is incorrect or has expired.", { code: "Invalid code" });
  await verifyOtp("email_verification", email, code, { consume: true });
  if (!user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date();
    user.lastLoginAt = new Date();
    await user.save();
  }
  return user;
}

export async function login(email: string, password: string): Promise<UserDoc> {
  const user = await User.findOne({ email }).select("+passwordHash +failedLoginAttempts +lockedUntil");
  if (!user?.passwordHash) {
    await verifyPassword(await DUMMY_HASH_PROMISE, password);
    throw unauthorized("Incorrect email or password.", "INVALID_CREDENTIALS");
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(429, "ACCOUNT_LOCKED", "Too many failed sign-in attempts. Please try again in a few minutes or reset your password.");
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const lock = attempts >= env.LOGIN_MAX_FAILED_ATTEMPTS;
    await User.updateOne(
      { _id: user._id },
      lock
        ? { $set: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60_000) } }
        : { $set: { failedLoginAttempts: attempts } },
    );
    throw unauthorized("Incorrect email or password.", "INVALID_CREDENTIALS");
  }

  if (user.status !== "active") throw new AppError(403, "ACCOUNT_SUSPENDED", "This account has been suspended. Please contact support.");
  if (!user.emailVerifiedAt) throw new AppError(403, "EMAIL_NOT_VERIFIED", "Please verify your email before signing in.");

  await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lastLoginAt: new Date() }, $unset: { lockedUntil: 1 } });
  return user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email });
  if (!user || user.status !== "active") return;
  const code = await issueOtp("password_reset", user.email);
  await sendMail(passwordResetEmail(user.email, code));
}

/** Sets a new password, signs out every session and invalidates outstanding access tokens. */
async function setPassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await withTransaction(async (session) => {
    await User.updateOne(
      { _id: userId },
      { $set: { passwordHash, failedLoginAttempts: 0 }, $unset: { lockedUntil: 1 }, $inc: { tokenVersion: 1 } },
      { session },
    );
    await revokeAllForUser(userId, session);
  });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await verifyOtp("password_reset", email, code, { consume: true });
  const user = await User.findOne({ email });
  // A valid code for a deleted account: nothing to do, but don't reveal it.
  if (!user) return;
  await setPassword(user.id, newPassword);
  if (!user.emailVerifiedAt) await User.updateOne({ _id: user._id }, { $set: { emailVerifiedAt: new Date() } });
  sendMailInBackground(passwordChangedEmail(user.email));
}

export async function changePassword(user: UserDoc, input: z.infer<typeof changePasswordSchema>): Promise<void> {
  const withHash = await User.findById(user._id).select("+passwordHash");
  if (!withHash?.passwordHash || !(await verifyPassword(withHash.passwordHash, input.currentPassword))) {
    throw new AppError(400, "INVALID_PASSWORD", "Your current password is incorrect.", { currentPassword: "Incorrect password" });
  }
  await setPassword(user.id, input.newPassword);
  sendMailInBackground(passwordChangedEmail(user.email));
}

export async function updateProfile(user: UserDoc, input: z.infer<typeof updateProfileSchema>): Promise<UserDoc> {
  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.phone !== undefined) user.phone = input.phone || undefined;
  if (input.company !== undefined) user.company = input.company || undefined;
  await user.save();
  return user;
}
