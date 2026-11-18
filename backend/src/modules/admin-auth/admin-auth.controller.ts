import type { Request, Response } from "express";
import { AppError, unauthorized } from "../../lib/errors.js";
import { handler, noContent, ok } from "../../lib/http.js";
import { currentUser } from "../../middleware/auth.js";
import { changePasswordSchema, emailOnlySchema, loginSchema, resetPasswordSchema } from "../auth/auth.schemas.js";
import * as auth from "../auth/auth.service.js";
import { clearAuthCookies, revokeRefreshToken, rotateRefreshToken, SCOPES, setAuthCookies, signAccessToken, startSession } from "../auth/tokens.js";
import { isStaffRole } from "../rbac/permissions.js";
import { permissionsOf } from "../rbac/staff-roles.service.js";
import { toPublicUser, User, type UserDoc } from "../users/user.model.js";

/**
 * Staff-console sessions (MANAGER / ADMIN). Completely separate from the public
 * website session: own cookies (ga_admin_at / ga_admin_rt), refresh path and
 * JWT audience, so signing in here never signs anyone in on the website.
 */

const sessionPayload = async (user: UserDoc) => ({ ...toPublicUser(user), superAdmin: Boolean(user.superAdmin), permissions: await permissionsOf(user) });

function refreshCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string | undefined>)[SCOPES.admin.refreshCookie];
}

/** POST /admin/auth/forgot-password: emails a reset code to a staff account. Always the same answer. */
export const forgotPassword = handler({ body: emailOnlySchema }, async ({ body }, _req, res) => {
  await auth.requestPasswordReset(body.email, { staffOnly: true });
  ok(res, { ok: true });
});

/** POST /admin/auth/reset-password: code from the email + new password. Signs out every session. */
export const resetPassword = handler({ body: resetPasswordSchema }, async ({ body }, _req, res) => {
  await auth.resetPassword(body.email, body.code, body.password);
  ok(res, { ok: true });
});

/** POST /admin/auth/login — staff accounts only. */
export const login = handler({ body: loginSchema }, async ({ body }, req, res) => {
  const user = await auth.login(body.email, body.password);
  // Same message as a wrong password so the console doesn't reveal which emails are customer accounts.
  if (!isStaffRole(user.role)) throw unauthorized("Incorrect email or password.", "INVALID_CREDENTIALS");
  await startSession(res, user, body.remember, req.headers["user-agent"], "admin");
  ok(res, await sessionPayload(user));
});

/** POST /admin/auth/refresh — rotates the admin refresh token. */
export async function refresh(req: Request, res: Response): Promise<void> {
  const presented = refreshCookie(req);
  if (!presented) throw unauthorized("Please sign in again.", "INVALID_REFRESH");
  try {
    const { userId, refresh: next } = await rotateRefreshToken(presented, req.headers["user-agent"], "admin");
    const user = await User.findById(userId);
    if (!user || user.status !== "active" || !isStaffRole(user.role)) throw unauthorized("Please sign in again.", "INVALID_REFRESH");
    setAuthCookies(res, signAccessToken(user, "admin"), next, "admin");
    ok(res, await sessionPayload(user));
  } catch (err) {
    clearAuthCookies(res, "admin");
    throw err;
  }
}

/** POST /admin/auth/logout */
export async function logout(req: Request, res: Response): Promise<void> {
  const presented = refreshCookie(req);
  if (presented) await revokeRefreshToken(presented);
  clearAuthCookies(res, "admin");
  noContent(res);
}

/** GET /admin/auth/me */
export async function me(req: Request, res: Response): Promise<void> {
  ok(res, await sessionPayload(currentUser(req)));
}

/** POST /admin/auth/change-password — revokes every session, keeps this console signed in. */
export const changePassword = handler({ body: changePasswordSchema }, async ({ body }, req, res) => {
  const user = currentUser(req);
  await auth.changePassword(user, body);
  const fresh = await User.findById(user._id);
  if (!fresh) throw new AppError(401, "INVALID_TOKEN", "Please sign in again.");
  await startSession(res, fresh, true, req.headers["user-agent"], "admin");
  ok(res, { ok: true });
});
