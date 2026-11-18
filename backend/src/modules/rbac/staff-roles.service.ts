import { isDuplicateKeyError } from "../../lib/db.js";
import { conflict, notFound } from "../../lib/errors.js";
import type { UserDoc } from "../users/user.model.js";
import { User } from "../users/user.model.js";
import { type GrantablePermission, type Permission, permissionsFor } from "./permissions.js";
import { StaffRole, type StaffRoleDoc, toStaffRoleDTO } from "./staff-role.model.js";

/**
 * A user's permissions: staff (MANAGER) with a custom role get that role's permissions (plus file
 * uploads, which every console editor needs); everyone else gets their role's defaults.
 * A custom role that was removed leaves its users with no console permissions until reassigned.
 */
export async function permissionsOf(user: Pick<UserDoc, "role" | "staffRole">): Promise<Permission[]> {
  if (user.role === "MANAGER" && user.staffRole) {
    const role = await StaffRole.findById(user.staffRole).select("permissions").lean();
    return role ? [...new Set<Permission>([...(role.permissions as Permission[]), "uploads:create"])] : [];
  }
  return permissionsFor(user.role);
}

export interface StaffRoleInput {
  name: string;
  description?: string;
  permissions: GrantablePermission[];
}

function nameTaken(err: unknown): never {
  if (isDuplicateKeyError(err)) throw conflict("A role with this name already exists.", { name: "Already in use" });
  throw err;
}

/**
 * The fixed staff roles for the Roles & permissions page: Super Admin, Admin and standard Manager,
 * each with how many active or suspended accounts have it and its permissions.
 */
export async function builtInRoles() {
  const [superAdmins, admins, managers] = await Promise.all([
    User.countDocuments({ role: "ADMIN", superAdmin: true }),
    User.countDocuments({ role: "ADMIN", superAdmin: { $ne: true } }),
    User.countDocuments({ role: "MANAGER", staffRole: { $exists: false } }),
  ]);
  return [
    { key: "SUPER_ADMIN", userCount: superAdmins, permissions: permissionsFor("ADMIN") },
    { key: "ADMIN", userCount: admins, permissions: permissionsFor("ADMIN") },
    { key: "MANAGER", userCount: managers, permissions: permissionsFor("MANAGER") },
  ];
}

export async function listStaffRoles() {
  const [roles, counts] = await Promise.all([
    StaffRole.find().sort({ name: 1 }),
    User.aggregate<{ _id: unknown; n: number }>([{ $match: { role: "MANAGER", staffRole: { $exists: true } } }, { $group: { _id: "$staffRole", n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  return roles.map((r) => toStaffRoleDTO(r, byId.get(r.id) ?? 0));
}

async function requireRole(id: string): Promise<StaffRoleDoc> {
  const role = await StaffRole.findById(id);
  if (!role) throw notFound("Role");
  return role;
}

export async function getStaffRole(id: string) {
  const role = await requireRole(id);
  return toStaffRoleDTO(role, await User.countDocuments({ role: "MANAGER", staffRole: role._id }));
}

export async function createStaffRole(input: StaffRoleInput) {
  try {
    const role = await StaffRole.create({ ...input, nameKey: input.name });
    return toStaffRoleDTO(role);
  } catch (err) {
    return nameTaken(err);
  }
}

export async function updateStaffRole(id: string, input: Partial<StaffRoleInput>) {
  const role = await requireRole(id);
  if (input.name !== undefined) role.set({ name: input.name, nameKey: input.name });
  if (input.description !== undefined) role.description = input.description;
  if (input.permissions !== undefined) role.set("permissions", input.permissions);
  try {
    await role.save();
  } catch (err) {
    nameTaken(err);
  }
  return getStaffRole(id);
}

/** A role still given to people can't be removed (they'd silently lose access). */
export async function deleteStaffRole(id: string): Promise<void> {
  const role = await requireRole(id);
  const inUse = await User.countDocuments({ staffRole: role._id });
  if (inUse > 0) throw conflict(`${inUse} user${inUse === 1 ? " has" : "s have"} this role. Give them another role first.`, undefined, "ROLE_IN_USE");
  await role.deleteOne();
}
