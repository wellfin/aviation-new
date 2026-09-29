import { Router } from "express";
import { z } from "zod";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { credentialRateLimit, otpRateLimit, sessionRateLimit } from "../../middleware/security.js";
import { handler, noContent, ok } from "../../lib/http.js";
import { isStaffRole, permissionsFor } from "../rbac/permissions.js";
import { toPublicUser, User } from "../users/user.model.js";
import {
  changePasswordSchema,
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from "./auth.schemas.js";
import * as auth from "./auth.service.js";
import { beginOAuth, completeOAuth } from "./oauth.js";
import { clearAuthCookies, revokeRefreshToken, rotateRefreshToken, SCOPES, setAuthCookies, signAccessToken, startSession } from "./tokens.js";
import { AppError, unauthorized } from "../../lib/errors.js";
import type { UserDoc } from "../users/user.model.js";

export const authRouter = Router();

const sessionPayload = (user: Parameters<typeof toPublicUser>[0]) => ({ ...toPublicUser(user), permissions: permissionsFor(user.role) });

/** The website session is for users and providers only; staff sign in through /admin/auth. */
export function assertWebAccount(user: UserDoc): void {
  if (isStaffRole(user.role)) throw new AppError(403, "STAFF_ACCOUNT", "Staff accounts sign in through the admin console.");
}

authRouter.post(
  "/register",
  credentialRateLimit,
  handler({ body: registerSchema }, async ({ body }, _req, res) => {
    ok(res, await auth.register(body), 201);
  }),
);

authRouter.post(
  "/verify-email",
  credentialRateLimit,
  handler({ body: verifyEmailSchema }, async ({ body }, req, res) => {
    const user = await auth.verifyEmail(body.email, body.code);
    assertWebAccount(user);
    await startSession(res, user, true, req.headers["user-agent"]);
    ok(res, sessionPayload(user));
  }),
);

authRouter.post(
  "/resend-verification",
  otpRateLimit,
  handler({ body: emailOnlySchema }, async ({ body }, _req, res) => {
    await auth.resendVerification(body.email);
    ok(res, { ok: true });
  }),
);

authRouter.post(
  "/login",
  credentialRateLimit,
  handler({ body: loginSchema }, async ({ body }, req, res) => {
    const user = await auth.login(body.email, body.password);
    assertWebAccount(user);
    await startSession(res, user, body.remember, req.headers["user-agent"]);
    ok(res, sessionPayload(user));
  }),
);

authRouter.post("/refresh", sessionRateLimit, async (req, res) => {
  const presented = (req.cookies as Record<string, string | undefined>)[SCOPES.web.refreshCookie];
  if (!presented) throw unauthorized("Please sign in again.", "INVALID_REFRESH");
  try {
    const { userId, refresh } = await rotateRefreshToken(presented, req.headers["user-agent"]);
    const user = await User.findById(userId);
    if (!user || user.status !== "active" || isStaffRole(user.role)) throw unauthorized("Please sign in again.", "INVALID_REFRESH");
    setAuthCookies(res, signAccessToken(user), refresh);
    ok(res, sessionPayload(user));
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
});

authRouter.post("/logout", async (req, res) => {
  const presented = (req.cookies as Record<string, string | undefined>)[SCOPES.web.refreshCookie];
  if (presented) await revokeRefreshToken(presented);
  clearAuthCookies(res);
  noContent(res);
});

authRouter.get("/me", requireAuth, (req, res) => {
  ok(res, sessionPayload(currentUser(req)));
});

authRouter.patch(
  "/me",
  requireAuth,
  handler({ body: updateProfileSchema }, async ({ body }, req, res) => {
    ok(res, sessionPayload(await auth.updateProfile(currentUser(req), body)));
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  credentialRateLimit,
  handler({ body: changePasswordSchema }, async ({ body }, req, res) => {
    const user = currentUser(req);
    await auth.changePassword(user, body);
    // Every other session was revoked; keep this device signed in with a fresh session.
    const fresh = await User.findById(user._id);
    if (fresh) await startSession(res, fresh, true, req.headers["user-agent"]);
    ok(res, { ok: true });
  }),
);

authRouter.post(
  "/forgot-password",
  credentialRateLimit,
  handler({ body: emailOnlySchema }, async ({ body }, _req, res) => {
    await auth.requestPasswordReset(body.email);
    ok(res, { ok: true });
  }),
);

authRouter.post(
  "/reset-password",
  credentialRateLimit,
  handler({ body: resetPasswordSchema }, async ({ body }, _req, res) => {
    await auth.resetPassword(body.email, body.code, body.password);
    ok(res, { ok: true });
  }),
);

const oauthParams = z.object({ provider: z.enum(["google", "linkedin"]) });
authRouter.get("/oauth/:provider", otpRateLimit, handler({ params: oauthParams }, (_input, req, res) => beginOAuth(req, res)));
authRouter.get("/oauth/:provider/callback", otpRateLimit, handler({ params: oauthParams }, (_input, req, res) => completeOAuth(req, res)));
