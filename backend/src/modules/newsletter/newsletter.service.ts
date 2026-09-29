import type { Response } from "express";
import type { QueryFilter } from "mongoose";
import { env } from "../../config/env.js";
import { randomToken, sha256 } from "../../lib/crypto.js";
import { isDuplicateKeyError } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";
import { containsRegex, paginated, skipFor, type Paginated } from "../../lib/pagination.js";
import { startCsvDownload, writeCsvRow } from "../leads/csv.js";
import { sendMailInBackground } from "../notifications/mailer.js";
import { newsletterConfirmEmail, newsletterWelcomeEmail } from "./newsletter.templates.js";
import type { ListSubscribersQuery, SubscribeInput } from "./newsletter.schemas.js";
import { Subscriber, type SubscriberAttrs, type SubscriberStatus, toSubscriberDTO, type SubscriberDTO } from "./subscriber.model.js";

const CONFIRM_TTL_MS = 7 * 24 * 60 * 60_000;
/** Minimum gap between confirmation emails to one address (stops mail-bombing via the form). */
const RESEND_COOLDOWN_MS = 60_000;

const apiUrl = (path: string) => `${env.PUBLIC_API_URL.replace(/\/+$/, "")}/api/v1${path}`;
export const confirmUrl = (token: string) => apiUrl(`/newsletter/confirm?token=${encodeURIComponent(token)}`);
export const unsubscribeUrl = (token: string) => apiUrl(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`);
export const frontendResult = (result: "confirmed" | "unsubscribed" | "invalid") => `${env.FRONTEND_URL.replace(/\/+$/, "")}/?newsletter=${result}`;

/**
 * Starts (or restarts) double opt-in. Always resolves without revealing whether
 * the address is already on the list; the caller returns one generic response.
 */
export async function subscribe(input: SubscribeInput): Promise<void> {
  if (input.website?.trim()) return;
  const email = input.email;
  const existing = await Subscriber.findOne({ email }, { status: 1, confirmSentAt: 1 }).lean();
  if (existing?.status === "subscribed") return;
  if (existing?.confirmSentAt && Date.now() - existing.confirmSentAt.getTime() < RESEND_COOLDOWN_MS) return;

  const token = randomToken();
  const now = new Date();
  try {
    await Subscriber.updateOne(
      { email, status: { $ne: "subscribed" } },
      {
        $set: { status: "pending", confirmTokenHash: sha256(token), confirmTokenExpiresAt: new Date(now.getTime() + CONFIRM_TTL_MS), confirmSentAt: now },
        $setOnInsert: { email, source: input.source || "website" },
      },
      { upsert: true },
    );
  } catch (err) {
    // A concurrent request created/confirmed the same address first — nothing more to do.
    if (isDuplicateKeyError(err)) return;
    throw err;
  }
  sendMailInBackground(newsletterConfirmEmail(email, confirmUrl(token)));
}

/** Completes double opt-in. Returns false for unknown, used or expired tokens. */
export async function confirmSubscription(token: string): Promise<boolean> {
  const unsubscribeToken = randomToken();
  const now = new Date();
  const sub = await Subscriber.findOneAndUpdate(
    { confirmTokenHash: sha256(token), status: "pending", confirmTokenExpiresAt: { $gt: now } },
    {
      $set: { status: "subscribed", confirmedAt: now, unsubscribeTokenHash: sha256(unsubscribeToken) },
      $unset: { confirmTokenHash: 1, confirmTokenExpiresAt: 1, unsubscribedAt: 1 },
    },
    { returnDocument: "after" },
  );
  if (!sub) return false;
  logger.info({ subscriberId: sub.id }, "Newsletter subscription confirmed");
  sendMailInBackground(newsletterWelcomeEmail(sub.email, unsubscribeUrl(unsubscribeToken)));
  return true;
}

/** Idempotent: repeating a valid unsubscribe link keeps succeeding. */
export async function unsubscribe(token: string): Promise<boolean> {
  const hash = sha256(token);
  const sub = await Subscriber.findOneAndUpdate(
    { unsubscribeTokenHash: hash, status: { $ne: "unsubscribed" } },
    { $set: { status: "unsubscribed", unsubscribedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (sub) return true;
  return Boolean(await Subscriber.exists({ unsubscribeTokenHash: hash }));
}

function subscriberFilter(status?: SubscriberStatus, q?: string): QueryFilter<SubscriberAttrs> {
  const filter: QueryFilter<SubscriberAttrs> = {};
  if (status) filter.status = status;
  if (q) filter.email = containsRegex(q);
  return filter;
}

export async function listSubscribers(query: ListSubscribersQuery): Promise<Paginated<SubscriberDTO>> {
  const filter = subscriberFilter(query.status, query.q);
  const [items, total] = await Promise.all([
    Subscriber.find(filter).sort({ createdAt: -1 }).skip(skipFor(query.page, query.pageSize)).limit(query.pageSize),
    Subscriber.countDocuments(filter),
  ]);
  return paginated(items.map(toSubscriberDTO), total, query.page, query.pageSize);
}

const EXPORT_LIMIT = 200_000;

export async function exportSubscribersCsv(status: SubscriberStatus | undefined, res: Response): Promise<void> {
  const cursor = Subscriber.find(subscriberFilter(status)).sort({ createdAt: 1 }).limit(EXPORT_LIMIT).cursor();
  startCsvDownload(res, `newsletter-${status ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`, [
    "email",
    "status",
    "source",
    "createdAt",
    "confirmedAt",
    "unsubscribedAt",
  ]);
  try {
    for await (const s of cursor) {
      await writeCsvRow(res, [s.email, s.status, s.source, s.createdAt, s.confirmedAt, s.unsubscribedAt]);
    }
  } catch (err) {
    logger.error({ err }, "Subscriber CSV export failed mid-stream");
  } finally {
    await cursor.close();
    res.end();
  }
}
