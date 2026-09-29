import type { ClientSession } from "mongoose";
import { hmacSha256Hex, safeEqual, sha256 } from "../../lib/crypto.js";
import { isDuplicateKeyError, withTransaction } from "../../lib/db.js";
import { badRequest } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { Payment, type PaymentStatus, PAYMENT_STATUSES, Subscription, type SubscriptionDoc, WebhookEvent } from "./billing.models.js";
import { webhookEnvelope, type WebhookEnvelope, type WebhookPayment, type WebhookSubscription } from "./billing.schemas.js";
import { grantTier, isTerminal, revokeTier } from "./billing.service.js";
import { webhookSecret } from "./razorpay.client.js";

export type WebhookOutcome = "processed" | "ignored" | "duplicate";

export interface WebhookRequest {
  rawBody: Buffer | undefined;
  signature: string | undefined;
  eventId: string | undefined;
}

/** Rejects anything not signed with our webhook secret over the exact received bytes. */
function assertSignature(rawBody: Buffer | undefined, signature: string | undefined): Buffer {
  const secret = webhookSecret();
  if (!rawBody || !signature) throw badRequest("Invalid webhook signature.", undefined, "INVALID_SIGNATURE");
  if (!safeEqual(hmacSha256Hex(secret, rawBody), signature.trim().toLowerCase())) {
    throw badRequest("Invalid webhook signature.", undefined, "INVALID_SIGNATURE");
  }
  return rawBody;
}

const toDate = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000) : undefined);

function applyPeriod(sub: SubscriptionDoc, entity: WebhookSubscription | undefined): void {
  const start = toDate(entity?.current_start);
  const end = toDate(entity?.current_end);
  if (start) sub.currentPeriodStart = start;
  if (end) sub.currentPeriodEnd = end;
}

async function recordPayment(sub: SubscriptionDoc, p: WebhookPayment, session: ClientSession): Promise<void> {
  const status: PaymentStatus = (PAYMENT_STATUSES as readonly string[]).includes(p.status) ? (p.status as PaymentStatus) : "authorized";
  await Payment.updateOne(
    { razorpayPaymentId: p.id },
    {
      $set: {
        amount: p.amount,
        currency: p.currency.toUpperCase(),
        status,
        ...(p.method ? { method: p.method } : {}),
        ...(p.invoice_id ? { razorpayInvoiceId: p.invoice_id } : {}),
        ...(p.error_description ? { errorDescription: p.error_description.slice(0, 300) } : {}),
      },
      $setOnInsert: {
        user: sub.user,
        provider: sub.provider,
        subscription: sub._id,
        plan: sub.plan,
        razorpayPaymentId: p.id,
        paidAt: toDate(p.created_at) ?? new Date(),
      },
    },
    { upsert: true, session },
  );
}

/** Applies one verified event. Returns false when the event is not relevant to us. */
async function dispatch(envelope: WebhookEnvelope, session: ClientSession): Promise<boolean> {
  const subEntity = envelope.payload.subscription?.entity;
  const payment = envelope.payload.payment?.entity;
  const razorpaySubscriptionId = subEntity?.id ?? payment?.subscription_id ?? undefined;
  if (!razorpaySubscriptionId) return false;

  const sub = await Subscription.findOne({ razorpaySubscriptionId }).session(session);
  if (!sub) return false;

  // Terminal subscriptions are never resurrected by late or out-of-order events.
  if (isTerminal(sub.status)) return false;

  switch (envelope.event) {
    case "subscription.authenticated":
      if (sub.status === "created") sub.status = "authenticated";
      applyPeriod(sub, subEntity);
      break;
    case "subscription.activated":
      sub.status = "active";
      applyPeriod(sub, subEntity);
      await grantTier(sub, session);
      break;
    case "subscription.charged":
      sub.status = "active";
      applyPeriod(sub, subEntity);
      if (payment) await recordPayment(sub, payment, session);
      await grantTier(sub, session);
      break;
    case "subscription.pending":
      // Renewal retrying: keep the tier during Razorpay's retry window.
      sub.status = "pending";
      break;
    case "subscription.halted":
      sub.status = "halted";
      await sub.save({ session });
      await revokeTier(sub, session);
      return true;
    case "subscription.cancelled":
    case "subscription.completed":
      sub.status = envelope.event === "subscription.cancelled" ? "cancelled" : "completed";
      sub.endedAt = new Date();
      await sub.save({ session });
      await revokeTier(sub, session);
      return true;
    case "payment.failed":
      if (!payment) return false;
      await recordPayment(sub, { ...payment, status: "failed" }, session);
      return true;
    default:
      return false;
  }
  await sub.save({ session });
  return true;
}

/**
 * Verifies and applies a Razorpay webhook exactly once. The event id is recorded in the
 * same transaction as its effects, so a failed apply is retried by Razorpay and a
 * replayed delivery is a no-op.
 */
export async function handleRazorpayWebhook(req: WebhookRequest): Promise<WebhookOutcome> {
  const rawBody = assertSignature(req.rawBody, req.signature);

  let json: unknown;
  try {
    json = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw badRequest("Invalid webhook payload.");
  }
  const parsed = webhookEnvelope.safeParse(json);
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues.length }, "Ignoring Razorpay webhook with an unexpected shape");
    return "ignored";
  }
  const envelope = parsed.data;
  const eventId = req.eventId?.trim().slice(0, 100) || `sha256:${sha256(rawBody.toString("utf8"))}`;

  try {
    const handled = await withTransaction(async (session) => {
      await WebhookEvent.create([{ eventId, event: envelope.event }], { session });
      return dispatch(envelope, session);
    });
    logger.info({ event: envelope.event, eventId, handled }, "Razorpay webhook processed");
    return handled ? "processed" : "ignored";
  } catch (err) {
    if (isDuplicateKeyError(err)) return "duplicate";
    throw err;
  }
}
