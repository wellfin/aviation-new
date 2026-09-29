import { Building2, CreditCard, Heart, Inbox, LayoutDashboard, MessageSquareText, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";

export interface AccountNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown only when the session holds this permission. */
  permission?: string;
  group: "account" | "business";
}

export const ACCOUNT_NAV: AccountNavItem[] = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, group: "account" },
  { href: "/account/profile", label: "Profile", icon: UserRound, group: "account" },
  { href: "/account/security", label: "Security", icon: ShieldCheck, group: "account" },
  { href: "/account/favorites", label: "Favourites", icon: Heart, permission: "favorites:manage", group: "account" },
  { href: "/account/reviews", label: "My reviews", icon: MessageSquareText, permission: "reviews:create", group: "account" },
  { href: "/account/listing", label: "My listing", icon: Building2, permission: "listing:manage:own", group: "business" },
  { href: "/account/enquiries", label: "Enquiries", icon: Inbox, permission: "enquiries:read:own", group: "business" },
  { href: "/account/billing", label: "Plan & billing", icon: CreditCard, permission: "billing:manage:own", group: "business" },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/account" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
