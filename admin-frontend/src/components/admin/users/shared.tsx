import type { UserRole } from "@/lib/auth/auth-context";
import { StatusPill } from "@/components/admin/ui";

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  phone: string | null;
  company: string | null;
  service: string | null;
  createdAt: string;
  status: "active" | "suspended";
  lastLoginAt: string | null;
  updatedAt: string;
  /** Custom staff role (Managers only); null means the standard Manager permissions. */
  staffRole: { id: string; name: string } | null;
  /** The owner account: can't be changed, suspended or deleted. */
  superAdmin: boolean;
  /** Only on the detail endpoint. */
  activeSessions?: number;
}

export const ROLES: UserRole[] = ["USER", "PROVIDER", "MANAGER", "ADMIN"];

export const ROLE_LABEL: Record<UserRole, string> = { USER: "User", PROVIDER: "Provider", MANAGER: "Manager", ADMIN: "Admin" };

export const ROLE_DESCRIPTION: Record<UserRole, string> = {
  USER: "Pilots and individuals: reviews, enquiries and favourites.",
  PROVIDER: "Aviation businesses: manage their own listing, enquiries and billing.",
  MANAGER: "Staff: moderation and content. No user, role or billing administration.",
  ADMIN: "Full access to everything, including users and billing.",
};

export const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "lastLogin", label: "Recent sign-in" },
];

const ROLE_TONE = { USER: "slate", PROVIDER: "blue", MANAGER: "purple", ADMIN: "amber" } as const;

/** The role's name: a custom staff role's own name, else the built-in label. */
export function RoleBadge({ role, staffRole, superAdmin }: { role: UserRole; staffRole?: { name: string } | null; superAdmin?: boolean }) {
  if (superAdmin) return <StatusPill status="Super Admin" tone="red" />;
  return <StatusPill status={role === "MANAGER" && staffRole ? staffRole.name : ROLE_LABEL[role]} tone={ROLE_TONE[role]} />;
}
