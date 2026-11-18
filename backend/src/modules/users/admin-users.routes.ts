import { Router } from "express";
import { z } from "zod";
import { currentUser, requirePermission } from "../../middleware/auth.js";
import { BUSINESS_EMAIL_MESSAGE, isBusinessEmail } from "../../lib/business-email.js";
import { hashPassword } from "../../lib/crypto.js";
import { isDuplicateKeyError, isObjectId, withTransaction } from "../../lib/db.js";
import { badRequest, conflict, forbidden, notFound, validationError } from "../../lib/errors.js";
import { created, handler, noContent, ok } from "../../lib/http.js";
import { containsRegex, paginated, paginationQuery, skipFor } from "../../lib/pagination.js";
import { RefreshToken } from "../auth/refresh-token.model.js";
import { revokeAllForUser } from "../auth/tokens.js";
import { email, password } from "../auth/auth.schemas.js";
import { ROLES } from "../rbac/permissions.js";
import { StaffRole } from "../rbac/staff-role.model.js";
import { toPublicUser, User, type UserDoc } from "./user.model.js";

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

/** Custom staff role names by id, for the given users. */
async function roleNames(users: UserDoc[]): Promise<Map<string, string>> {
  const ids = [...new Set(users.map((u) => u.staffRole).filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  const roles = await StaffRole.find({ _id: { $in: ids } }).select("name").lean();
  return new Map(roles.map((r) => [String(r._id), r.name]));
}

function adminView(u: UserDoc, names: Map<string, string> = new Map()) {
  const staffRoleId = u.role === "MANAGER" && u.staffRole ? String(u.staffRole) : null;
  return {
    ...toPublicUser(u),
    status: u.status,
    superAdmin: Boolean(u.superAdmin),
    leadEmails: u.leadEmails !== false,
    /** Custom staff role (MANAGER only); null means the standard Manager permissions. */
    staffRole: staffRoleId ? { id: staffRoleId, name: names.get(staffRoleId) ?? "(removed role)" } : null,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    updatedAt: u.updatedAt.toISOString(),
  };
}

const SUPER_ADMIN_LOCKED = "The Super Admin can't be changed, suspended or deleted.";
const ADMINS_ARE_SUPER_ADMINS_JOB = "Only the Super Admin can add, change or remove Admins.";
/** Staff are added with a custom role; the plain "Manager (standard)" role is no longer offered. */
const CHOOSE_ROLE = { staffRole: "Choose a role" };

/** A custom role id must exist; null clears it. */
async function checkStaffRole(id: string | null | undefined): Promise<void> {
  if (id && !(await StaffRole.exists({ _id: id }))) throw validationError({ staffRole: "Choose an existing role" });
}

const staffRoleId = z.string().refine(isObjectId, "Invalid role").nullable();

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
    const names = await roleNames(items);
    ok(res, paginated(items.map((u) => adminView(u, names)), total, query.page, query.pageSize));
  }),
);

adminUsersRouter.get(
  "/:id",
  requirePermission("users:read"),
  handler({ params: idParams }, async ({ params }, _req, res) => {
    const user = await User.findById(params.id);
    if (!user) throw notFound("User");
    const activeSessions = await RefreshToken.countDocuments({ user: user._id, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
    ok(res, { ...adminView(user, await roleNames([user])), activeSessions });
  }),
);

const updateBody = z
  .object({ role: z.enum(ROLES), status: z.enum(["active", "suspended"]), staffRole: staffRoleId })
  .partial()
  .refine((v) => v.role !== undefined || v.status !== undefined || v.staffRole !== undefined, "Nothing to update");

/** Adding a person from the console: the admin sets the password and the email counts as confirmed. */
const createBody = z.object({
  firstName: z.string().trim().min(2, "Please enter at least 2 characters").max(100),
  lastName: z.string().trim().min(2, "Please enter at least 2 characters").max(100),
  email: email.refine(isBusinessEmail, BUSINESS_EMAIL_MESSAGE),
  password,
  // Added people are staff; site users and providers sign up on the website.
  role: z.enum(["ADMIN", "MANAGER"], { message: "Choose Admin, Manager or a custom role" }),
  staffRole: staffRoleId.optional(),
  phone: z.string().trim().max(30).regex(/^[+()\d\s-]*$/, "Enter a valid phone number").optional(),
  company: z.string().trim().max(120).optional(),
});

adminUsersRouter.post(
  "/",
  requirePermission("users:manage"),
  handler({ body: createBody }, async ({ body }, req, res) => {
    if (body.role === "ADMIN" && !currentUser(req).superAdmin) throw forbidden(ADMINS_ARE_SUPER_ADMINS_JOB);
    if (body.role === "MANAGER" && !body.staffRole) throw validationError(CHOOSE_ROLE);
    const custom = body.role === "MANAGER" ? (body.staffRole ?? null) : null;
    await checkStaffRole(custom);
    try {
      const user = await User.create({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        role: body.role,
        ...(custom ? { staffRole: custom } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.company ? { company: body.company } : {}),
        emailVerifiedAt: new Date(),
      });
      created(res, adminView(user, await roleNames([user])));
    } catch (err) {
      if (isDuplicateKeyError(err)) throw conflict("An account with this email already exists.", { email: "Already registered" });
      throw err;
    }
  }),
);

adminUsersRouter.patch(
  "/:id",
  requirePermission("users:manage"),
  handler({ params: idParams, body: updateBody }, async ({ params, body }, req, res) => {
    const actor = currentUser(req);
    if (actor.id === params.id) throw badRequest("You can't change your own role or status.");

    await checkStaffRole(body.staffRole);
    const updated = await withTransaction(async (session) => {
      const user = await User.findById(params.id).session(session);
      if (!user) throw notFound("User");
      if (user.superAdmin) throw forbidden(SUPER_ADMIN_LOCKED);
      if ((user.role === "ADMIN" || body.role === "ADMIN") && !actor.superAdmin) throw forbidden(ADMINS_ARE_SUPER_ADMINS_JOB);
      // Staff keep a custom role: setting MANAGER, or clearing the custom role, needs one.
      const nextStaffRole = body.staffRole !== undefined ? body.staffRole : user.role === "MANAGER" ? user.staffRole : null;
      if ((body.role ?? user.role) === "MANAGER" && (body.role !== undefined || body.staffRole !== undefined) && !nextStaffRole) throw validationError(CHOOSE_ROLE);
      const privilegeChanged = (body.role && body.role !== user.role) || (body.status && body.status !== user.status);
      if (body.role) user.role = body.role;
      if (body.status) user.status = body.status;
      // A custom role only applies to staff (MANAGER); any other role clears it.
      if (user.role !== "MANAGER") user.set("staffRole", undefined);
      else if (body.staffRole !== undefined) user.set("staffRole", body.staffRole ?? undefined);
      if (privilegeChanged) {
        // Force existing sessions to pick up the new role / suspension immediately.
        user.tokenVersion = (user.tokenVersion ?? 0) + 1;
        await revokeAllForUser(user.id, session);
      }
      await user.save({ session });
      return user;
    });
    ok(res, adminView(updated, await roleNames([updated])));
  }),
);

/**
 * Turns new-lead emails on or off for a staff account. Anyone with Leads access can change their own;
 * Admins can change other staff's, except the Super Admin's (only the Super Admin can).
 */
adminUsersRouter.put(
  "/:id/lead-emails",
  requirePermission("leads:read"),
  handler({ params: idParams, body: z.object({ enabled: z.boolean() }) }, async ({ params, body }, req, res) => {
    const self = currentUser(req).id === params.id;
    const user = await User.findById(params.id);
    if (!user) throw notFound("User");
    if (!self && (!req.permissions?.has("users:manage") || user.superAdmin)) throw forbidden(user.superAdmin ? "Only the Super Admin can change this." : undefined);
    if (user.role !== "ADMIN" && user.role !== "MANAGER") throw badRequest("Lead emails are for staff accounts.");
    user.leadEmails = body.enabled;
    await user.save();
    ok(res, adminView(user, await roleNames([user])));
  }),
);

adminUsersRouter.delete(
  "/:id",
  requirePermission("users:manage"),
  handler({ params: idParams }, async ({ params }, req, res) => {
    if (currentUser(req).id === params.id) throw badRequest("You can't delete your own account here.");
    if (await User.exists({ _id: params.id, superAdmin: true })) throw forbidden(SUPER_ADMIN_LOCKED);
    if (!currentUser(req).superAdmin && (await User.exists({ _id: params.id, role: "ADMIN" }))) throw forbidden(ADMINS_ARE_SUPER_ADMINS_JOB);
    await withTransaction(async (session) => {
      const user = await User.findByIdAndDelete(params.id, { session });
      if (!user) throw notFound("User");
      await RefreshToken.deleteMany({ user: user._id }, { session });
    });
    noContent(res);
  }),
);
