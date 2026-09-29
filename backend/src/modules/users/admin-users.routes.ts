import { Router } from "express";
import { z } from "zod";
import { currentUser, requirePermission } from "../../middleware/auth.js";
import { isObjectId, withTransaction } from "../../lib/db.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { handler, noContent, ok } from "../../lib/http.js";
import { containsRegex, paginated, paginationQuery, skipFor } from "../../lib/pagination.js";
import { RefreshToken } from "../auth/refresh-token.model.js";
import { revokeAllForUser } from "../auth/tokens.js";
import { ROLES } from "../rbac/permissions.js";
import { toPublicUser, User } from "./user.model.js";

export const adminUsersRouter = Router();

const idParams = z.object({ id: z.string().refine(isObjectId, "Invalid id") });

const listQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  sort: z.enum(["newest", "oldest", "name", "lastLogin"]).default("newest"),
});

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { firstName: 1, lastName: 1 },
  lastLogin: { lastLoginAt: -1 },
} as const;

function adminView(u: Parameters<typeof toPublicUser>[0]) {
  return { ...toPublicUser(u), status: u.status, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, updatedAt: u.updatedAt.toISOString() };
}

adminUsersRouter.get(
  "/",
  requirePermission("users:read"),
  handler({ query: listQuery }, async ({ query }, _req, res) => {
    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;
    if (query.q) {
      const rx = containsRegex(query.q);
      filter.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }, { company: rx }];
    }
    const [items, total] = await Promise.all([
      User.find(filter).sort(SORTS[query.sort]).skip(skipFor(query.page, query.pageSize)).limit(query.pageSize),
      User.countDocuments(filter),
    ]);
    ok(res, paginated(items.map(adminView), total, query.page, query.pageSize));
  }),
);

adminUsersRouter.get(
  "/:id",
  requirePermission("users:read"),
  handler({ params: idParams }, async ({ params }, _req, res) => {
    const user = await User.findById(params.id);
    if (!user) throw notFound("User");
    const activeSessions = await RefreshToken.countDocuments({ user: user._id, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
    ok(res, { ...adminView(user), activeSessions });
  }),
);

const updateBody = z
  .object({ role: z.enum(ROLES), status: z.enum(["active", "suspended"]) })
  .partial()
  .refine((v) => v.role !== undefined || v.status !== undefined, "Nothing to update");

adminUsersRouter.patch(
  "/:id",
  requirePermission("users:manage"),
  handler({ params: idParams, body: updateBody }, async ({ params, body }, req, res) => {
    const actor = currentUser(req);
    if (actor.id === params.id) throw badRequest("You can't change your own role or status.");

    const updated = await withTransaction(async (session) => {
      const user = await User.findById(params.id).session(session);
      if (!user) throw notFound("User");
      const privilegeChanged = (body.role && body.role !== user.role) || (body.status && body.status !== user.status);
      if (body.role) user.role = body.role;
      if (body.status) user.status = body.status;
      if (privilegeChanged) {
        // Force existing sessions to pick up the new role / suspension immediately.
        user.tokenVersion = (user.tokenVersion ?? 0) + 1;
        await revokeAllForUser(user.id, session);
      }
      await user.save({ session });
      return user;
    });
    ok(res, adminView(updated));
  }),
);

adminUsersRouter.delete(
  "/:id",
  requirePermission("users:manage"),
  handler({ params: idParams }, async ({ params }, req, res) => {
    if (currentUser(req).id === params.id) throw badRequest("You can't delete your own account here.");
    await withTransaction(async (session) => {
      const user = await User.findByIdAndDelete(params.id, { session });
      if (!user) throw notFound("User");
      await RefreshToken.deleteMany({ user: user._id }, { session });
    });
    noContent(res);
  }),
);
