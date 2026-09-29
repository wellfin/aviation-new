import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  HelpCircle,
  Inbox,
  Mail,
  Megaphone,
  MessageSquareText,
  Newspaper,
  PlaneLanding,
  Tags,
  Users,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Permission required to see the item (the API enforces the same permission). */
  permission: string;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: BarChart3, permission: "reports:read" }],
  },
  {
    label: "Directory",
    items: [
      { href: "/admin/providers", label: "Providers", icon: Building2, permission: "providers:manage" },
      { href: "/admin/airports", label: "Airports", icon: PlaneLanding, permission: "airports:manage" },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText, permission: "reviews:moderate" },
      { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, permission: "enquiries:read:any" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/news", label: "News", icon: Newspaper, permission: "content:manage" },
      { href: "/admin/faqs", label: "FAQs", icon: HelpCircle, permission: "content:manage" },
      { href: "/admin/ads", label: "Advertising", icon: Megaphone, permission: "ads:manage" },
      { href: "/admin/pricing", label: "Pricing plans", icon: Tags, permission: "pricing:manage" },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/admin/leads", label: "Leads", icon: FileText, permission: "leads:read" },
      { href: "/admin/newsletter", label: "Newsletter", icon: Mail, permission: "leads:read" },
      { href: "/admin/billing", label: "Billing", icon: CreditCard, permission: "billing:read:any" },
      { href: "/admin/users", label: "Users", icon: Users, permission: "users:read" },
    ],
  },
];

/** Any of these grants access to the admin area. */
export const ADMIN_ENTRY_PERMISSIONS = [...new Set(ADMIN_NAV.flatMap((g) => g.items.map((i) => i.permission)))];
