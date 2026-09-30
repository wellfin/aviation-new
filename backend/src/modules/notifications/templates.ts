import { env } from "../../config/env.js";
import type { MailMessage } from "./mailer.js";

const SIGNATURE = "\n\n— Global Aviation Services Directory";

export function verificationEmail(to: string, name: string, code: string): MailMessage {
  return {
    to,
    subject: "Verify your email address",
    text: `Hi ${name},\n\nYour verification code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.\n\nIf you didn't create an account, you can ignore this email.${SIGNATURE}`,
  };
}

export function passwordResetEmail(to: string, code: string): MailMessage {
  return {
    to,
    subject: "Your password reset code",
    text: `Your password reset code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.\n\nIf you didn't request a reset, you can safely ignore this email — your password won't change.${SIGNATURE}`,
  };
}

export function emailCheckCode(to: string, code: string): MailMessage {
  return {
    to,
    subject: "Confirm your email address",
    text: `Your confirmation code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.${SIGNATURE}`,
  };
}

export function passwordChangedEmail(to: string): MailMessage {
  return {
    to,
    subject: "Your password was changed",
    text: `The password for your account was just changed and all other sessions were signed out.\n\nIf this wasn't you, reset your password immediately at ${env.FRONTEND_URL}/forgot-password.${SIGNATURE}`,
  };
}
