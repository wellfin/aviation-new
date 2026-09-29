import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError, forbidden, unauthorized } from "../lib/errors.js";
import { SCOPES, type SessionScope, verifyAccessToken } from "../modules/auth/tokens.js";
import { hasPermission, isStaffRole, type Permission } from "../modules/rbac/permissions.js";
import { User, type UserDoc } from "../modules/users/user.model.js";

/** Routes under /api/v1/admin use the staff-console session; everything else uses the website session. */
export function scopeFor(req: Request): SessionScope {
  return req.path.startsWith("/admin/") || req.path === "/admin" ? "admin" : "web";
}

function extractToken(req: Request, scope: SessionScope): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const cookie = (req.cookies as Record<string, string> | undefined)?.[SCOPES[scope].accessCookie];
  return typeof cookie === "string" && cookie ? cookie : undefined;
}

/**
 * Resolves the current user from the access token of the request's scope
 * (cookie or Bearer header). The user is re-read from the database on every
 * request so role changes, suspensions and password changes take effect
 * immediately. Staff accounts never have a website session and customers
 * never have an admin session. Never rejects: routes decide whether a user is required.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const scope = scopeFor(req);
  const token = extractToken(req, scope);
  if (!token) return next();
  let claims;
  try {
    claims = verifyAccessToken(token, scope);
  } catch (err) {
    // Expired/invalid tokens only matter to routes that require auth.
    req.authError = err as AppError;
    return next();
  }
  const user = await User.findById(claims.sub);
  if (!user || user.status !== "active" || (user.tokenVersion ?? 0) !== claims.ver || isStaffRole(user.role) !== (scope === "admin")) {
    req.authError = unauthorized("Your session is no longer valid. Please sign in again.", "INVALID_TOKEN");
    return next();
  }
  req.user = user;
  next();
};

/** Requires a signed-in user; returns the TOKEN_EXPIRED code so clients know to refresh. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (req.user) return next();
  next(req.authError ?? unauthorized());
};

export function currentUser(req: Request): UserDoc {
  if (!req.user) throw unauthorized();
  return req.user;
}

/** Requires a signed-in user holding every listed permission. */
export function requirePermission(...permissions: Permission[]): RequestHandler[] {
  return [
    requireAuth,
    (req: Request, _res: Response, next: NextFunction) => {
      const role = req.user!.role;
      if (permissions.every((p) => hasPermission(role, p))) return next();
      next(forbidden());
    },
  ];
}

/** Blocks actions that need a confirmed email address (reviews, enquiries while signed in, listings). */
export const requireVerifiedEmail: RequestHandler = (req, _res, next) => {
  if (req.user?.emailVerifiedAt) return next();
  next(new AppError(403, "EMAIL_NOT_VERIFIED", "Please verify your email address first."));
};
