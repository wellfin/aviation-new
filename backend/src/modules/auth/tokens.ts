import type { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";
import type { ClientSession } from "mongoose";
import { cookieSecure, env } from "../../config/env.js";
import { randomToken, sha256 } from "../../lib/crypto.js";
import { withTransaction } from "../../lib/db.js";
import { unauthorized } from "../../lib/errors.js";
import type { Role } from "../rbac/permissions.js";
import type { UserDoc } from "../users/user.model.js";
import { RefreshToken } from "./refresh-token.model.js";

/**
 * Two fully separate session scopes:
 *  - "web"   — the public website (users & providers): /api/v1/auth/*
 *  - "admin" — the staff console: /api/v1/admin/auth/*
 * Each has its own cookies, refresh-cookie path and JWT audience, so a token
 * from one scope is never accepted by the other.
 */
export type SessionScope = "web" | "admin";

interface ScopeConfig {
  accessCookie: string;
  refreshCookie: string;
  /** The refresh cookie is only ever sent to that scope's auth routes. */
  refreshPath: string;
  audience: string;
}

export const SCOPES: Record<SessionScope, ScopeConfig> = {
  web: { accessCookie: "ga_at", refreshCookie: "ga_rt", refreshPath: "/api/v1/auth", audience: "global-aviation-web" },
  admin: { accessCookie: "ga_admin_at", refreshCookie: "ga_admin_rt", refreshPath: "/api/v1/admin/auth", audience: "global-aviation-admin" },
};

export interface AccessClaims {
  sub: string;
  role: Role;
  ver: number;
}

const ALGORITHM = "HS256";
const ISSUER = "global-aviation-api";

export function signAccessToken(user: UserDoc, scope: SessionScope = "web"): string {
  const claims: AccessClaims = { sub: user.id, role: user.role, ver: user.tokenVersion ?? 0 };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, { algorithm: ALGORITHM, issuer: ISSUER, audience: SCOPES[scope].audience, expiresIn: env.JWT_ACCESS_TTL_SECONDS });
}

export function verifyAccessToken(token: string, scope: SessionScope = "web"): AccessClaims {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALGORITHM], issuer: ISSUER, audience: SCOPES[scope].audience });
    if (typeof payload !== "object" || typeof payload.sub !== "string") throw new Error("malformed");
    return { sub: payload.sub, role: payload.role as Role, ver: Number(payload.ver ?? 0) };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw unauthorized("Your session has expired.", "TOKEN_EXPIRED");
    throw unauthorized("Invalid session.", "INVALID_TOKEN");
  }
}

function baseCookie(): CookieOptions {
  return { httpOnly: true, secure: cookieSecure, sameSite: "lax", domain: env.COOKIE_DOMAIN };
}

interface IssuedRefresh {
  token: string;
  expiresAt: Date;
  persistent: boolean;
}

async function createRefresh(
  userId: string,
  family: string,
  scope: SessionScope,
  persistent: boolean,
  userAgent: string | undefined,
  session?: ClientSession,
): Promise<IssuedRefresh> {
  const token = randomToken(48);
  const ttlMs = persistent ? env.REFRESH_TTL_DAYS * 86_400_000 : env.REFRESH_SHORT_TTL_HOURS * 3_600_000;
  const expiresAt = new Date(Date.now() + ttlMs);
  await RefreshToken.create([{ user: userId, family, scope, tokenHash: sha256(token), persistent, expiresAt, userAgent: userAgent?.slice(0, 300) }], {
    session,
  });
  return { token, expiresAt, persistent };
}

export function setAuthCookies(res: Response, accessToken: string, refresh: IssuedRefresh, scope: SessionScope = "web"): void {
  const cfg = SCOPES[scope];
  res.cookie(cfg.accessCookie, accessToken, { ...baseCookie(), path: "/", maxAge: env.JWT_ACCESS_TTL_SECONDS * 1000 });
  // A non-persistent ("remember me" unticked) refresh cookie is a browser-session cookie.
  res.cookie(cfg.refreshCookie, refresh.token, {
    ...baseCookie(),
    path: cfg.refreshPath,
    ...(refresh.persistent ? { expires: refresh.expiresAt } : {}),
  });
}

export function clearAuthCookies(res: Response, scope: SessionScope = "web"): void {
  const cfg = SCOPES[scope];
  res.clearCookie(cfg.accessCookie, { ...baseCookie(), path: "/" });
  res.clearCookie(cfg.refreshCookie, { ...baseCookie(), path: cfg.refreshPath });
}

/** Starts a new login session (new token family) in `scope`. */
export async function startSession(res: Response, user: UserDoc, persistent: boolean, userAgent?: string, scope: SessionScope = "web"): Promise<void> {
  const refresh = await createRefresh(user.id, randomToken(16), scope, persistent, userAgent);
  setAuthCookies(res, signAccessToken(user, scope), refresh, scope);
}

/**
 * Exchanges a refresh token for a new pair. The old token is revoked in the same
 * transaction; reusing an already-rotated token revokes the entire family.
 * A token from another scope is rejected. Returns the user id the session belongs to.
 */
export async function rotateRefreshToken(
  presented: string,
  userAgent: string | undefined,
  scope: SessionScope = "web",
): Promise<{ userId: string; refresh: IssuedRefresh }> {
  const hash = sha256(presented);
  const outcome = await withTransaction(async (session) => {
    const current = await RefreshToken.findOne({ tokenHash: hash }).session(session);
    if (!current || current.expiresAt <= new Date() || (current.scope ?? "web") !== scope) return { kind: "invalid" as const };
    if (current.revokedAt) {
      await RefreshToken.updateMany({ family: current.family, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } }, { session });
      return { kind: "reused" as const };
    }
    current.revokedAt = new Date();
    current.replacedAt = new Date();
    await current.save({ session });
    const refresh = await createRefresh(String(current.user), current.family, scope, current.persistent, userAgent, session);
    return { kind: "ok" as const, userId: String(current.user), refresh };
  });

  if (outcome.kind === "reused") throw unauthorized("This session is no longer valid. Please sign in again.", "REFRESH_REUSED");
  if (outcome.kind === "invalid") throw unauthorized("Your session has expired. Please sign in again.", "INVALID_REFRESH");
  return { userId: outcome.userId, refresh: outcome.refresh };
}

export async function revokeRefreshToken(presented: string): Promise<void> {
  const token = await RefreshToken.findOne({ tokenHash: sha256(presented) });
  if (token) await RefreshToken.updateMany({ family: token.family, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
}

/** Signs a user out everywhere (both scopes). */
export async function revokeAllForUser(userId: string, session?: ClientSession): Promise<void> {
  await RefreshToken.updateMany({ user: userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } }, { session });
}
