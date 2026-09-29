/**
 * Role → Permission model. Roles are stored on the user; permissions are
 * derived here so every authorization decision is made on the server.
 *
 *  USER      pilots / individuals: reviews, enquiries, favourites
 *  PROVIDER  aviation businesses: manage their own listing, see their enquiries, billing
 *  MANAGER   staff: moderation and content, no user/role/billing administration
 *  ADMIN     full access
 */
export const ROLES = ["USER", "PROVIDER", "MANAGER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "profile:manage",
  "favorites:manage",
  "reviews:create",
  "enquiries:create",

  "listing:manage:own",
  "enquiries:read:own",
  "billing:manage:own",
  "uploads:create",

  "providers:manage",
  "airports:manage",
  "reviews:moderate",
  "enquiries:read:any",
  "content:manage",
  "leads:read",
  "leads:manage",
  "reports:read",

  "ads:manage",
  "pricing:manage",
  "users:read",
  "users:manage",
  "billing:read:any",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const USER_PERMS: Permission[] = ["profile:manage", "favorites:manage", "reviews:create", "enquiries:create"];
const PROVIDER_PERMS: Permission[] = [...USER_PERMS, "listing:manage:own", "enquiries:read:own", "billing:manage:own", "uploads:create"];
const MANAGER_PERMS: Permission[] = [
  ...USER_PERMS,
  "uploads:create",
  "providers:manage",
  "airports:manage",
  "reviews:moderate",
  "enquiries:read:any",
  "content:manage",
  "leads:read",
  "leads:manage",
  "reports:read",
  "users:read",
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  USER: new Set(USER_PERMS),
  PROVIDER: new Set(PROVIDER_PERMS),
  MANAGER: new Set(MANAGER_PERMS),
  ADMIN: new Set(PERMISSIONS),
};

/** Roles that use the staff console (and never the public website session). */
export const STAFF_ROLES: ReadonlySet<Role> = new Set<Role>(["MANAGER", "ADMIN"]);

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.has(role);
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsFor(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
