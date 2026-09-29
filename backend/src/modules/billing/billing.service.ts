import type { ClientSession, Types } from "mongoose";
import { hmacSha256Hex, safeEqual } from "../../lib/crypto.js";
import { withTransaction } from "../../lib/db.js";
import { badRequest, conflict, notFound, validationError } from "../../lib/errors.js";
import { type Paginated, paginated, skipFor } from "../../lib/pagination.js";
import { Provider } from "../providers/provider.model.js";
import type { UserDoc } from "../users/user.model.js";
import { optionalRange } from "../reports/date-range.js";
import {
  type BillingCycle,
  LIVE_STATUSES,
  type PaidPlan,
  Payment,
  type PaymentDoc,
  type PaymentStatus,
  Subscription,
  type SubscriptionDoc,
  type SubscriptionStatus,
  TERMINAL_STATUSES,
} from "./billing.models.js";
import { findBillingPlan, resolvePlan } from "./billing.plans.js";
import { cancelRazorpaySubscription, createRazorpaySubscription, razorpayCredentials } from "./razorpay.client.js";

/** Billing cycles Razorpay should schedule (Razorpay requires a finite count): ~10 years. */
const TOTAL_COUNT: Record<BillingCycle, number> = { monthly: 120, yearly: 10 };

// ---------------------------------------------------------------- DTOs

/** Id of a reference whether or not it has been populated. */
function refId(ref: unknown): string {
  return typeof ref === "object" && ref !== null && "_id" in ref ? String((ref as { _id: unknown })._id) : String(ref);
}

export interface SubscriptionDTO {
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

export function toSubscriptionDTO(s: SubscriptionDoc): SubscriptionDTO {
  return {
    id: s.id,
    providerId: refId(s.provider),
    plan: s.plan,
    billing: s.billing,
    status: s.status,
    amount: s.amount,
    currency: s.currency,
    razorpaySubscriptionId: s.razorpaySubscriptionId,
    currentPeriodStart: s.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
    endedAt: s.endedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export interface PaymentDTO {
  id: string;
  subscriptionId: string;
  plan: PaidPlan;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  paidAt: string;
}

export function toPaymentDTO(p: PaymentDoc): PaymentDTO {
  return {
    id: p.id,
    subscriptionId: refId(p.subscription),
    plan: p.plan,
    razorpayPaymentId: p.razorpayPaymentId,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    method: p.method ?? null,
    paidAt: p.paidAt.toISOString(),
  };
}

// ---------------------------------------------------------------- shared helpers

/** Adds one billing cycle (used until Razorpay reports the authoritative period). */
export function addCycle(from: Date, cycle: BillingCycle): Date {
  const d = new Date(from);
  if (cycle === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}

export async function grantTier(sub: SubscriptionDoc, session: ClientSession): Promise<void> {
  await Provider.updateOne({ _id: sub.provider }, { $set: { tier: sub.plan } }, { session });
}

/**
 * Called when `sub` stops being live: the provider falls back to the tier of another
 * live subscription if one exists (e.g. after a plan change), otherwise to basic.
 */
export async function revokeTier(sub: SubscriptionDoc, session: ClientSession): Promise<void> {
  const other = await Subscription.findOne({ provider: sub.provider, _id: { $ne: sub._id }, status: { $in: LIVE_STATUSES } })
    .sort({ createdAt: -1 })
    .session(session);
  await Provider.updateOne({ _id: sub.provider }, { $set: { tier: other?.plan ?? "basic" } }, { session });
}

export const isTerminal = (status: SubscriptionStatus) => TERMINAL_STATUSES.includes(status);

async function ownedProvider(userId: Types.ObjectId, providerId?: string) {
  if (providerId) {
    const provider = await Provider.findOne({ _id: providerId, owner: userId }).select("name tier");
    if (!provider) throw notFound("Listing");
    return provider;
  }
  const providers = await Provider.find({ owner: userId }).select("name tier").sort({ createdAt: 1 }).limit(2);
  if (providers.length === 0) throw badRequest("Create your company listing before choosing a plan.", undefined, "NO_LISTING");
  if (providers.length > 1) throw validationError({ providerId: "Choose which listing this plan is for." });
  return providers[0]!;
}

// ---------------------------------------------------------------- provider-facing

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

/** Creates a Razorpay subscription and returns what Razorpay Checkout needs to collect payment. */
export async function createSubscription(
  user: UserDoc,
  input: { plan: PaidPlan; billing: BillingCycle; providerId?: string | undefined },
): Promise<CheckoutSession> {
  // Listing problems are the user's to fix, so report them before configuration errors.
  const provider = await ownedProvider(user._id, input.providerId);
  const { keyId } = razorpayCredentials();
  if (await Subscription.exists({ provider: provider._id, status: { $in: LIVE_STATUSES } })) {
    throw conflict("This listing already has an active subscription. Cancel it before choosing another plan.", undefined, "ALREADY_SUBSCRIBED");
  }
  const { plan, razorpayPlanId, amount } = await resolvePlan(input.plan, input.billing);

  const remote = await createRazorpaySubscription({
    planId: razorpayPlanId,
    totalCount: TOTAL_COUNT[input.billing],
    notes: { userId: user.id, providerId: String(provider._id), plan: input.plan, billing: input.billing },
  });
  await Subscription.create({
    user: user._id,
    provider: provider._id,
    plan: input.plan,
    billing: input.billing,
    razorpaySubscriptionId: remote.id,
    razorpayPlanId,
    status: "created",
    amount,
    currency: plan.currency.toUpperCase(),
  });

  return {
    subscriptionId: remote.id,
    keyId,
    plan: input.plan,
    billing: input.billing,
    amount,
    currency: plan.currency.toUpperCase(),
    planName: plan.name,
    prefill: { name: `${user.firstName} ${user.lastName}`.trim(), email: user.email, contact: user.phone ?? "" },
  };
}

/**
 * Confirms a Checkout success callback. The signature proves Razorpay issued this
 * payment for this subscription; the status change, payment record and tier upgrade
 * are committed atomically.
 */
export async function verifySubscriptionPayment(
  user: UserDoc,
  input: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string },
): Promise<SubscriptionDTO> {
  const { keySecret } = razorpayCredentials();
  const expected = hmacSha256Hex(keySecret, `${input.razorpay_payment_id}|${input.razorpay_subscription_id}`);
  if (!safeEqual(expected, input.razorpay_signature.toLowerCase())) {
    throw badRequest("Payment verification failed.", undefined, "INVALID_SIGNATURE");
  }

  const updated = await withTransaction(async (session) => {
    const sub = await Subscription.findOne({ razorpaySubscriptionId: input.razorpay_subscription_id, user: user._id }).session(session);
    if (!sub) throw notFound("Subscription");
    if (isTerminal(sub.status)) return sub;

    const now = new Date();
    if (sub.status !== "active") sub.status = "active";
    if (!sub.currentPeriodEnd) {
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd = addCycle(now, sub.billing);
    }
    await sub.save({ session });
    // Recorded as authorized; the `subscription.charged` webhook upgrades it to captured.
    await Payment.updateOne(
      { razorpayPaymentId: input.razorpay_payment_id },
      {
        $setOnInsert: {
          user: sub.user,
          provider: sub.provider,
          subscription: sub._id,
          plan: sub.plan,
          razorpayPaymentId: input.razorpay_payment_id,
          amount: sub.amount,
          currency: sub.currency,
          status: "authorized",
          paidAt: now,
        },
      },
      { upsert: true, session },
    );
    await grantTier(sub, session);
    return sub;
  });
  return toSubscriptionDTO(updated);
}

/** The caller's current subscription (live one first, else the most recent) with its plan and listing. */
export async function getMySubscription(user: UserDoc) {
  const sub =
    (await Subscription.findOne({ user: user._id, status: { $in: LIVE_STATUSES } }).sort({ createdAt: -1 })) ??
    (await Subscription.findOne({ user: user._id }).sort({ createdAt: -1 }));
  if (!sub) return { subscription: null, plan: null, listing: null };
  const [plan, provider] = await Promise.all([findBillingPlan(sub.plan), Provider.findById(sub.provider).select("name slug tier")]);
  return {
    subscription: toSubscriptionDTO(sub),
    plan: plan
      ? { id: plan.id, name: plan.name, monthlyPrice: plan.monthlyPrice, yearlyPrice: plan.yearlyPrice, currency: plan.currency }
      : null,
    listing: provider ? { id: provider.id, name: provider.name, slug: provider.slug, tier: provider.tier } : null,
  };
}

/** Schedules cancellation at the end of the paid cycle; the tier is removed by the `subscription.cancelled` webhook. */
export async function cancelMySubscription(user: UserDoc): Promise<SubscriptionDTO> {
  razorpayCredentials();
  const sub = await Subscription.findOne({ user: user._id, status: { $in: LIVE_STATUSES } }).sort({ createdAt: -1 });
  if (!sub) throw notFound("Active subscription");
  if (sub.cancelAtPeriodEnd) return toSubscriptionDTO(sub);
  const remote = await cancelRazorpaySubscription(sub.razorpaySubscriptionId, true);
  const updated = await Subscription.findOneAndUpdate(
    { _id: sub._id, status: { $in: LIVE_STATUSES } },
    { $set: { cancelAtPeriodEnd: true, ...(remote.current_end ? { currentPeriodEnd: new Date(remote.current_end * 1000) } : {}) } },
    { returnDocument: "after" },
  );
  return toSubscriptionDTO(updated ?? sub);
}

export async function listMyPayments(user: UserDoc, q: { page: number; pageSize: number }): Promise<Paginated<PaymentDTO>> {
  const filter = { user: user._id };
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ paidAt: -1, _id: -1 }).skip(skipFor(q.page, q.pageSize)).limit(q.pageSize),
    Payment.countDocuments(filter),
  ]);
  return paginated(items.map(toPaymentDTO), total, q.page, q.pageSize);
}

// ---------------------------------------------------------------- admin

interface UserRef {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
}
interface ProviderRef {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  tier: string;
}

const userView = (u: unknown) => {
  const ref = u as UserRef | null;
  return ref && "email" in ref ? { id: String(ref._id), name: `${ref.firstName} ${ref.lastName}`.trim(), email: ref.email } : null;
};
const providerView = (p: unknown) => {
  const ref = p as ProviderRef | null;
  return ref && "slug" in ref ? { id: String(ref._id), name: ref.name, slug: ref.slug, tier: ref.tier } : null;
};

export async function adminListSubscriptions(q: { page: number; pageSize: number; status?: SubscriptionStatus | undefined; plan?: PaidPlan | undefined }) {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.plan) filter.plan = q.plan;
  const [items, total] = await Promise.all([
    Subscription.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skipFor(q.page, q.pageSize))
      .limit(q.pageSize)
      .populate("user", "firstName lastName email")
      .populate("provider", "name slug tier"),
    Subscription.countDocuments(filter),
  ]);
  const views = items.map((s) => ({ ...toSubscriptionDTO(s), user: userView(s.user), listing: providerView(s.provider) }));
  return paginated(views, total, q.page, q.pageSize);
}

export async function adminListPayments(q: {
  page: number;
  pageSize: number;
  from?: string | undefined;
  to?: string | undefined;
  status?: PaymentStatus | undefined;
}) {
  const filter: Record<string, unknown> = {};
  const range = optionalRange(q);
  if (range) filter.paidAt = range;
  if (q.status) filter.status = q.status;

  const [items, total, totals] = await Promise.all([
    Payment.find(filter)
      .sort({ paidAt: -1, _id: -1 })
      .skip(skipFor(q.page, q.pageSize))
      .limit(q.pageSize)
      .populate("user", "firstName lastName email")
      .populate("provider", "name slug tier"),
    Payment.countDocuments(filter),
    // Revenue only counts captured money, whatever status filter the list uses.
    Payment.aggregate<{ _id: string; amount: number; count: number }>([
      { $match: { ...(range ? { paidAt: range } : {}), status: "captured" } },
      { $group: { _id: "$currency", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const views = items.map((p) => ({
    ...toPaymentDTO(p),
    user: userView(p.user),
    listing: providerView(p.provider),
    errorDescription: p.errorDescription ?? null,
  }));
  return {
    ...paginated(views, total, q.page, q.pageSize),
    totals: totals.map((t) => ({ currency: t._id, capturedAmount: t.amount, capturedCount: t.count })),
  };
}
