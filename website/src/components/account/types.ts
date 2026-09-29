import type { Provider, ProviderTier } from "@/lib/types";

/** Response DTOs of the signed-in account endpoints (mirrors the backend services). */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** GET/PATCH /auth/me */
export interface AccountProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "USER" | "PROVIDER" | "MANAGER" | "ADMIN";
  emailVerified: boolean;
  phone: string | null;
  company: string | null;
  service: string | null;
  createdAt: string;
  permissions: string[];
}

export interface ProviderRef {
  id: string;
  slug: string;
  name: string;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

/** GET /me/reviews */
export interface OwnReview {
  id: string;
  author: string;
  role: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  status: ReviewStatus;
  provider: ProviderRef;
  moderationNote: string;
  updatedAt: string;
}

export type ListingStatus = "draft" | "pending" | "published" | "rejected" | "suspended";

export interface ListingLimits {
  galleryImages: number;
  video: boolean;
  socials: boolean;
}

/** GET/POST/PATCH /me/listing */
export interface Listing extends Provider {
  status: ListingStatus;
  rejectionReason: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  limits: ListingLimits;
}

export const ENQUIRY_STATUSES = ["new", "read", "replied", "closed", "spam"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
export const OWNER_SETTABLE_STATUSES = ["read", "replied", "closed", "spam"] as const;

/** GET /me/enquiries(/:id) */
export interface Enquiry {
  id: string;
  type: "general" | "fleet";
  status: EnquiryStatus;
  provider: ProviderRef;
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
  trip: { tripType: string; from: string; to: string; departAt: string; passengers: number; aircraft: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type PaidPlan = "pro" | "ultra_pro";
export type BillingCycle = "monthly" | "yearly";
export type SubscriptionStatus = "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired";

export const LIVE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = ["authenticated", "active", "pending"];

export interface Subscription {
  id: string;
  providerId: string;
  plan: PaidPlan;
  billing: BillingCycle;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  razorpaySubscriptionId: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  endedAt: string | null;
  createdAt: string;
}

/** GET /billing/subscription */
export interface SubscriptionOverview {
  subscription: Subscription | null;
  plan: { id: PaidPlan; name: string; monthlyPrice: number | null; yearlyPrice: number | null; currency: string } | null;
  listing: { id: string; name: string; slug: string; tier: ProviderTier } | null;
}

/** GET /billing/payments */
export interface Payment {
  id: string;
  subscriptionId: string;
  plan: PaidPlan;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: "authorized" | "captured" | "failed" | "refunded";
  method: string | null;
  paidAt: string;
}

/** POST /billing/subscriptions */
export interface CheckoutSession {
  subscriptionId: string;
  keyId: string;
  plan: PaidPlan;
  billing: BillingCycle;
  amount: number;
  currency: string;
  planName: string;
  prefill: { name: string; email: string; contact: string };
}

/** POST /uploads */
export interface UploadResult {
  id: string;
  url: string;
  kind: "image" | "document";
  mime: string;
  size: number;
  originalName: string;
  createdAt: string;
}

export const TIER_LABEL: Record<ProviderTier, string> = { basic: "Basic", pro: "Pro", ultra_pro: "Ultra Pro" };
