import mongoose, { type Model, type PipelineStage } from "mongoose";
import { validationError } from "../../lib/errors.js";
import { Payment } from "../billing/billing.models.js";
import { PROVIDER_TIERS } from "../catalog/categories.js";
import { Enquiry, ENQUIRY_STATUSES } from "../enquiries/enquiry.model.js";
import { Provider, PROVIDER_STATUSES } from "../providers/provider.model.js";
import { ROLES } from "../rbac/permissions.js";
import { Review, REVIEW_STATUSES } from "../reviews/review.model.js";
import { User } from "../users/user.model.js";
import { type DateRange, resolveRange } from "./date-range.js";
import type { Interval, TimeseriesMetric } from "./reports.schemas.js";

/**
 * Collections owned by other modules that may not exist yet in every deployment.
 * They are read through the raw driver so this module has no load-time dependency on them;
 * a missing collection simply aggregates to zero.
 */
export const LEADS_COLLECTION = "leads";
export const NEWSLETTER_COLLECTION = "newslettersubscribers";

interface CountRow {
  _id: string | null;
  count: number;
}

/** Sums grouped rows into a record with every known key present (zero-filled). */
function countsByKey<K extends string>(keys: readonly K[], rows: CountRow[]): Record<K, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const row of rows) if (row._id !== null && row._id in out) out[row._id as K] += row.count;
  return out;
}

/** Same as countsByKey but for open-ended keys (e.g. lead types owned by another module). */
function countsOpen(rows: CountRow[]): Record<string, number> {
  return Object.fromEntries(rows.filter((r) => r._id !== null).map((r) => [String(r._id), r.count]));
}

const sum = (values: Iterable<number>) => [...values].reduce((a, b) => a + b, 0);

function groupCount(field: string): PipelineStage[] {
  return [{ $group: { _id: `$${field}`, count: { $sum: 1 } } }];
}

function rawCollection(name: string) {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");
  return db.collection(name);
}

export async function overview(q: { from?: string | undefined; to?: string | undefined }) {
  const range = resolveRange(q);
  const inRange = { $gte: range.from, $lt: range.to };

  const [usersByRole, newUsers, providerRows, reviewRows, enquiryRows, leadRows, newsletterRows, revenueRows] = await Promise.all([
    User.aggregate<CountRow>(groupCount("role")),
    User.countDocuments({ createdAt: inRange }),
    Provider.aggregate<{ _id: { status: string; tier: string }; count: number }>([
      { $group: { _id: { status: "$status", tier: "$tier" }, count: { $sum: 1 } } },
    ]),
    Review.aggregate<CountRow>(groupCount("status")),
    Enquiry.aggregate<CountRow>([{ $match: { createdAt: inRange } }, ...groupCount("status")]),
    rawCollection(LEADS_COLLECTION)
      .aggregate<CountRow>([{ $match: { createdAt: inRange } }, ...groupCount("type")])
      .toArray(),
    rawCollection(NEWSLETTER_COLLECTION).aggregate<CountRow>(groupCount("status")).toArray(),
    Payment.aggregate<{ _id: string; amount: number; count: number }>([
      { $match: { status: "captured", paidAt: inRange } },
      { $group: { _id: "$currency", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const byRole = countsByKey(ROLES, usersByRole);
  const providerByStatus = countsByKey(
    PROVIDER_STATUSES,
    providerRows.map((r) => ({ _id: r._id.status, count: r.count })),
  );
  const providerByTier = countsByKey(
    PROVIDER_TIERS,
    providerRows.map((r) => ({ _id: r._id.tier, count: r.count })),
  );
  const reviews = countsByKey(REVIEW_STATUSES, reviewRows);
  const enquiriesByStatus = countsByKey(ENQUIRY_STATUSES, enquiryRows);
  const leadsByType = countsOpen(leadRows);
  const newsletterByStatus = countsOpen(newsletterRows);

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    users: { total: sum(Object.values(byRole)), byRole, newInRange: newUsers },
    providers: {
      total: sum(Object.values(providerByStatus)),
      byStatus: providerByStatus,
      byTier: providerByTier,
      pendingListings: providerByStatus.pending,
    },
    reviews: { ...reviews, total: sum(Object.values(reviews)) },
    enquiries: { inRange: sum(Object.values(enquiriesByStatus)), byStatus: enquiriesByStatus },
    leads: { inRange: sum(Object.values(leadsByType)), byType: leadsByType },
    newsletter: {
      // Double opt-in: only confirmed ("subscribed") addresses count as subscribers.
      subscribers: newsletterByStatus.subscribed ?? 0,
      pending: newsletterByStatus.pending ?? 0,
      unsubscribed: newsletterByStatus.unsubscribed ?? 0,
    },
    revenue: {
      byCurrency: revenueRows.map((r) => ({ currency: r._id, amount: r.amount, payments: r.count })),
    },
  };
}

// ---------------------------------------------------------------- time series

const DEFAULT_DAYS: Record<Interval, number> = { day: 30, week: 7 * 26, month: 365 };
const MAX_BUCKETS: Record<Interval, number> = { day: 366, week: 260, month: 120 };

/** UTC bucket start, matching `$dateTrunc` with timezone UTC and weeks starting Monday. */
export function truncUtc(date: Date, interval: Interval): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (interval === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  if (interval === "month") d.setUTCDate(1);
  return d;
}

function nextBucket(date: Date, interval: Interval): Date {
  const d = new Date(date);
  if (interval === "day") d.setUTCDate(d.getUTCDate() + 1);
  else if (interval === "week") d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

function bucketsFor(range: DateRange, interval: Interval): Date[] {
  const out: Date[] = [];
  for (let d = truncUtc(range.from, interval); d < range.to; d = nextBucket(d, interval)) {
    out.push(d);
    if (out.length > MAX_BUCKETS[interval]) {
      throw validationError({ from: `Too many ${interval}s in this range (max ${MAX_BUCKETS[interval]}). Use a larger interval.` });
    }
  }
  return out;
}

interface MetricSource {
  model: Model<never>;
  dateField: string;
  match: Record<string, unknown>;
  /** Accumulator value per document: 1 for counts, a field for sums. */
  value: 1 | string;
}

function sourceFor(metric: TimeseriesMetric, currency: string): MetricSource {
  switch (metric) {
    case "users":
      return { model: User as unknown as Model<never>, dateField: "createdAt", match: {}, value: 1 };
    case "enquiries":
      return { model: Enquiry as unknown as Model<never>, dateField: "createdAt", match: {}, value: 1 };
    case "reviews":
      return { model: Review as unknown as Model<never>, dateField: "createdAt", match: {}, value: 1 };
    case "revenue":
      return { model: Payment as unknown as Model<never>, dateField: "paidAt", match: { status: "captured", currency }, value: "$amount" };
  }
}

export interface TimeseriesPoint {
  /** ISO timestamp of the bucket start (UTC). */
  period: string;
  value: number;
}

/** One aggregation per request; empty buckets are filled with zero so charts get a continuous axis. */
export async function timeseries(q: {
  metric: TimeseriesMetric;
  interval: Interval;
  currency: string;
  from?: string | undefined;
  to?: string | undefined;
}): Promise<TimeseriesPoint[]> {
  const range = resolveRange(q, { defaultDays: DEFAULT_DAYS[q.interval] });
  const buckets = bucketsFor(range, q.interval);
  const src = sourceFor(q.metric, q.currency);

  const rows = await src.model.aggregate<{ _id: Date; value: number }>([
    { $match: { ...src.match, [src.dateField]: { $gte: range.from, $lt: range.to } } },
    {
      $group: {
        _id: { $dateTrunc: { date: `$${src.dateField}`, unit: q.interval, timezone: "UTC", startOfWeek: "monday" } },
        value: { $sum: src.value },
      },
    },
  ]);

  const byPeriod = new Map(rows.map((r) => [r._id.getTime(), r.value]));
  return buckets.map((b) => ({ period: b.toISOString(), value: byPeriod.get(b.getTime()) ?? 0 }));
}
