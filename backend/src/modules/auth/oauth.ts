import type { Request, Response } from "express";
import { cookieSecure, env } from "../../config/env.js";
import { randomToken, safeEqual } from "../../lib/crypto.js";
import { AppError, notFound, serviceUnavailable } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { User, type UserDoc } from "../users/user.model.js";
import { isStaffRole } from "../rbac/permissions.js";
import { startSession } from "./tokens.js";

export type OAuthProviderName = "google" | "linkedin";

interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  clientId?: string;
  clientSecret?: string;
  idField: "googleId" | "linkedinId";
}

const PROVIDERS: Record<OAuthProviderName, ProviderConfig> = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    idField: "googleId",
  },
  linkedin: {
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    userInfoUrl: "https://api.linkedin.com/v2/userinfo",
    scope: "openid email profile",
    clientId: env.LINKEDIN_CLIENT_ID,
    clientSecret: env.LINKEDIN_CLIENT_SECRET,
    idField: "linkedinId",
  },
};

const STATE_COOKIE = "ga_oauth";
const STATE_PATH = "/api/v1/auth/oauth";

function providerFor(name: string): ProviderConfig & { name: OAuthProviderName } {
  if (name !== "google" && name !== "linkedin") throw notFound("Sign-in provider");
  const cfg = PROVIDERS[name];
  if (!cfg.clientId || !cfg.clientSecret) throw serviceUnavailable(`${name === "google" ? "Google" : "LinkedIn"} sign-in is not configured.`);
  return { ...cfg, name };
}

const callbackUrl = (name: OAuthProviderName) => `${env.PUBLIC_API_URL}/api/v1/auth/oauth/${name}/callback`;

/** Only same-site relative paths are accepted as post-login destinations (open-redirect guard). */
export function safeNextPath(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/account";
}

export function beginOAuth(req: Request, res: Response): void {
  const provider = providerFor(String(req.params.provider));
  const state = randomToken(24);
  const next = safeNextPath(req.query.next);
  res.cookie(STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: STATE_PATH,
    maxAge: 10 * 60_000,
  });
  const url = new URL(provider.authorizeUrl);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: provider.clientId!,
    redirect_uri: callbackUrl(provider.name),
    scope: provider.scope,
    state,
    ...(provider.name === "google" ? { prompt: "select_account" } : {}),
  }).toString();
  res.redirect(302, url.toString());
}

interface OidcProfile {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  given_name?: string;
  family_name?: string;
  name?: string;
}

async function exchangeCode(provider: ProviderConfig & { name: OAuthProviderName }, code: string): Promise<OidcProfile> {
  const tokenRes = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(provider.name),
      client_id: provider.clientId!,
      client_secret: provider.clientSecret!,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenRes.ok) throw new AppError(502, "OAUTH_FAILED", "Could not complete sign-in.");
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
  if (!accessToken) throw new AppError(502, "OAUTH_FAILED", "Could not complete sign-in.");

  const infoRes = await fetch(provider.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) });
  if (!infoRes.ok) throw new AppError(502, "OAUTH_FAILED", "Could not complete sign-in.");
  return (await infoRes.json()) as OidcProfile;
}

async function findOrCreateUser(provider: ProviderConfig, profile: OidcProfile): Promise<UserDoc> {
  const idPath = `oauth.${provider.idField}`;
  const byId = await User.findOne({ [idPath]: profile.sub });
  if (byId) return byId;

  const verified = profile.email_verified === true || profile.email_verified === "true";
  if (!profile.email || !verified) throw new AppError(400, "OAUTH_EMAIL_UNVERIFIED", "Your account email must be verified with the provider.");
  const email = profile.email.toLowerCase();

  // Link to an existing account only because the provider has verified the same email.
  const byEmail = await User.findOne({ email });
  if (byEmail) {
    byEmail.set(idPath, profile.sub);
    byEmail.emailVerifiedAt ??= new Date();
    await byEmail.save();
    return byEmail;
  }

  const [first, ...rest] = (profile.name ?? "").split(" ");
  return User.create({
    email,
    firstName: (profile.given_name || first || "Aviation").slice(0, 100),
    lastName: (profile.family_name || rest.join(" ") || "User").slice(0, 100),
    role: "USER",
    emailVerifiedAt: new Date(),
    oauth: { [provider.idField]: profile.sub },
  });
}

export async function completeOAuth(req: Request, res: Response): Promise<void> {
  const loginUrl = new URL("/login", env.FRONTEND_URL);
  const fail = (reason: string) => {
    loginUrl.searchParams.set("error", reason);
    res.clearCookie(STATE_COOKIE, { path: STATE_PATH });
    res.redirect(302, loginUrl.toString());
  };

  let saved: { state?: string; next?: string } = {};
  try {
    saved = JSON.parse(String((req.cookies as Record<string, string>)[STATE_COOKIE] ?? "{}")) as typeof saved;
  } catch {
    saved = {};
  }
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!saved.state || !state || !code || !safeEqual(saved.state, state)) return fail("oauth_state");

  try {
    const provider = providerFor(String(req.params.provider));
    const profile = await exchangeCode(provider, code);
    const user = await findOrCreateUser(provider, profile);
    if (user.status !== "active") return fail("account_suspended");
    // Staff never get a website session, even through a social login.
    if (isStaffRole(user.role)) return fail("staff_account");
    user.lastLoginAt = new Date();
    await user.save();
    await startSession(res, user, true, req.headers["user-agent"]);
    res.clearCookie(STATE_COOKIE, { path: STATE_PATH });
    res.redirect(302, new URL(safeNextPath(saved.next), env.FRONTEND_URL).toString());
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err, provider: req.params.provider }, "OAuth sign-in failed");
    fail(err instanceof AppError && err.code === "OAUTH_EMAIL_UNVERIFIED" ? "oauth_email" : "oauth_failed");
  }
}
