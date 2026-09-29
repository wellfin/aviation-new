import { pino } from "pino";
import { env, isProduction } from "../config/env.js";

/**
 * Structured logger. Secrets must never be logged: credentials, tokens, OTPs
 * and cookies are redacted wherever they appear in logged objects.
 */
export const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "*.password",
  "*.newPassword",
  "*.currentPassword",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.code",
  "*.otp",
  "*.secret",
  "*.signature",
  "*.razorpay_signature",
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
  ...(isProduction || env.NODE_ENV === "test"
    ? {}
    : { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" } } }),
});
