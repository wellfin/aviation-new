import type { Request, RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { env, isTest } from "../config/env.js";
import { safeEqual } from "../lib/crypto.js";
import { forbidden } from "../lib/errors.js";

interface LimiterOptions {
  max: number;
  windowMinutes: number;
  message: string;
  /** Requests for which the limiter is bypassed. */
  skip?: (req: Request) => boolean;
}

function limiter({ max, windowMinutes, message, skip }: LimiterOptions): RequestHandler {
  return rateLimit({
    windowMs: windowMinutes * 60_000,
    limit: isTest ? 10_000 : max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...(skip ? { skip } : {}),
    handler: (_req, res) => {
      res.status(429).json({ error: { code: "TOO_MANY_REQUESTS", message } });
    },
  });
}

export const INTERNAL_KEY_HEADER = "x-internal-api-key";

/**
 * Server-to-server calls (the website's server-side rendering) share one IP for
 * every visitor, so they authenticate with INTERNAL_API_KEY and bypass the
 * per-IP global limit. They never bypass auth/credential limits.
 */
export function isInternalRequest(req: Request): boolean {
  const presented = req.headers[INTERNAL_KEY_HEADER];
  return Boolean(env.INTERNAL_API_KEY) && typeof presented === "string" && safeEqual(presented, env.INTERNAL_API_KEY!);
}

/*
 * In-memory rate limits (per API instance). Brute-force protection that must
 * hold across instances — login lockout and OTP attempt limits — is enforced
 * in MongoDB, so a shared store (e.g. Redis) is only needed at scale.
 * Each limiter below keeps its own budget so, e.g., silent session refreshes
 * can never lock a visitor out of signing in.
 */
export const globalRateLimit = limiter({
  max: env.RATE_LIMIT_MAX,
  windowMinutes: env.RATE_LIMIT_WINDOW_MINUTES,
  message: "Too many requests. Please slow down.",
  skip: isInternalRequest,
});
/** Password-bearing and account-creating requests: login, register, verify, reset, change password. */
export const credentialRateLimit = limiter({
  max: env.AUTH_RATE_LIMIT_MAX,
  windowMinutes: env.RATE_LIMIT_WINDOW_MINUTES,
  message: "Too many attempts. Please try again later.",
});
/** Silent session refresh — generous, it runs on every page load of a signed-in user. */
export const sessionRateLimit = limiter({
  max: env.SESSION_RATE_LIMIT_MAX,
  windowMinutes: env.RATE_LIMIT_WINDOW_MINUTES,
  message: "Too many requests. Please slow down.",
});
/** Sending/verifying one-time codes and starting OAuth. */
export const otpRateLimit = limiter({
  max: env.OTP_RATE_LIMIT_MAX,
  windowMinutes: env.RATE_LIMIT_WINDOW_MINUTES,
  message: "Too many code requests. Please wait a few minutes and try again.",
});
export const formRateLimit = limiter({ max: 20, windowMinutes: 60, message: "You've sent a lot of messages. Please try again later." });

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for cookie-authenticated requests: state-changing requests that
 * carry an Origin header must come from an allowed frontend origin. Combined
 * with SameSite=Lax cookies and a strict CORS allow-list.
 */
export const originCheck: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin || env.CORS_ORIGINS.includes(origin)) return next();
  next(forbidden("Cross-site request blocked."));
};
