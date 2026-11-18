import type { UserRole } from "@/lib/auth/auth-context";

/** A custom staff role made under Roles & permissions (GET /admin/roles). */
export interface StaffRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

/** What a custom role can be given, grouped as in the console menu. Mirrors backend GRANTABLE_PERMISSIONS. */
export const PERMISSION_GROUPS: Array<{ label: string; items: Array<{ value: string; label: string; hint: string }> }> = [
  {
    label: "Overview",
    items: [{ value: "reports:read", label: "Dashboard", hint: "Traffic, listings and revenue figures" }],
  },
  {
    label: "Directory",
    items: [
      { value: "providers:manage", label: "Providers & services", hint: "Add, edit, publish and remove listings; service categories" },
      { value: "airports:manage", label: "Airports", hint: "Add and edit airports" },
      { value: "reviews:moderate", label: "Reviews", hint: "Approve, reject and delete reviews" },
      { value: "enquiries:read:any", label: "Enquiries", hint: "See every enquiry sent to listings" },
    ],
  },
  {
    label: "Content",
    items: [
      { value: "content:manage", label: "News & FAQs", hint: "Write and publish articles and FAQs" },
      { value: "ads:manage", label: "Ads & ad packages", hint: "Ad campaigns and the packages offered to advertisers" },
      { value: "pricing:manage", label: "Pricing plans", hint: "Listing plans and prices" },
    ],
  },
  {
    label: "Customers",
    items: [
      { value: "leads:read", label: "Leads & newsletter (view)", hint: "See contact, demo and advertising requests and subscribers" },
      { value: "leads:manage", label: "Leads & newsletter (manage)", hint: "Update leads, unsubscribe subscribers" },
      { value: "billing:read:any", label: "Billing (view)", hint: "Payments and subscriptions" },
      { value: "users:read", label: "Users & roles (view only)", hint: "See accounts and roles; adding users and editing roles stay with Admins" },
    ],
  },
];

/** Only the built-in Admin role can have this one (set by the Super Admin). */
export const USERS_MANAGE_ITEM = { value: "users:manage", label: "Users & roles (manage)", hint: "Add, change, suspend and delete users; create and edit roles" };

export const PERMISSION_LABEL: Record<string, string> = Object.fromEntries([...PERMISSION_GROUPS.flatMap((g) => g.items), USERS_MANAGE_ITEM].map((i) => [i.value, i.label]));

/** GET /admin/roles/built-in */
export interface BuiltInRole {
  key: "SUPER_ADMIN" | "ADMIN" | "MANAGER";
  userCount: number;
  /** Console permissions it grants now. */
  permissions: string[];
  /** What the Super Admin can switch on or off for it (empty = fixed). */
  editable: string[];
  /** True when the Super Admin changed it from the defaults. */
  customised: boolean;
}

export const BUILT_IN_TEXT: Record<BuiltInRole["key"], { name: string; description: string }> = {
  SUPER_ADMIN: { name: "Super Admin", description: "The owner account. Full access; can't be changed, suspended or deleted." },
  ADMIN: { name: "Admin", description: "Full access to everything, including users, roles and billing." },
  MANAGER: { name: "Manager (standard)", description: "Staff: moderation and content. No user, role or billing administration." },
};

/**
 * One choice in the role pickers: a built-in role, or a custom staff role (stored as MANAGER + staffRole).
 * Encoded as "ADMIN", "MANAGER", "USER", "PROVIDER" or "custom:<id>".
 */
export type RoleChoice = string;

export function choiceOf(user: { role: UserRole; staffRole: { id: string } | null }): RoleChoice {
  return user.role === "MANAGER" && user.staffRole ? `custom:${user.staffRole.id}` : user.role;
}

export function requestFor(choice: RoleChoice): { role: UserRole; staffRole: string | null } {
  return choice.startsWith("custom:") ? { role: "MANAGER", staffRole: choice.slice(7) } : { role: choice as UserRole, staffRole: null };
}
