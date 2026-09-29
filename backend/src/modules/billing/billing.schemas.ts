import { z } from "zod";
import { isObjectId } from "../../lib/db.js";
import { paginationQuery } from "../../lib/pagination.js";
import { dateRangeShape } from "../reports/date-range.js";
import { BILLING_CYCLES, PAID_PLANS, PAYMENT_STATUSES, SUBSCRIPTION_STATUSES } from "./billing.models.js";

const razorpayId = (prefix: string) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^${prefix}_[A-Za-z0-9]{6,40}$`), "Invalid id");

export const createSubscriptionBody = z.object({
  plan: z.enum(PAID_PLANS),
  billing: z.enum(BILLING_CYCLES),
  /** Only needed when the account manages more than one listing. */
  providerId: z.string().refine(isObjectId, "Invalid id").optional(),
});

export const verifySubscriptionBody = z.object({
  razorpay_payment_id: razorpayId("pay"),
  razorpay_subscription_id: razorpayId("sub"),
  razorpay_signature: z.string().trim().regex(/^[a-f0-9]{64}$/i, "Invalid signature"),
});

export const myPaymentsQuery = paginationQuery;

export const adminSubscriptionsQuery = paginationQuery.extend({
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  plan: z.enum(PAID_PLANS).optional(),
});

export const adminPaymentsQuery = paginationQuery.extend({
  ...dateRangeShape,
  status: z.enum(PAYMENT_STATUSES).optional(),
});

/** The parts of a Razorpay webhook we act on; everything else is ignored. */
const unixSeconds = z.number().int().nonnegative().nullable().optional();

export const webhookEnvelope = z.object({
  event: z.string().max(60),
  payload: z
    .object({
      subscription: z
        .object({
          entity: z.object({
            id: z.string().max(64),
            status: z.string().max(30).optional(),
            current_start: unixSeconds,
            current_end: unixSeconds,
          }),
        })
        .optional(),
      payment: z
        .object({
          entity: z.object({
            id: z.string().max(64),
            amount: z.number().int().nonnegative(),
            currency: z.string().length(3),
            status: z.string().max(30),
            method: z.string().max(40).nullable().optional(),
            invoice_id: z.string().max(64).nullable().optional(),
            subscription_id: z.string().max(64).nullable().optional(),
            error_description: z.string().nullable().optional(),
            created_at: unixSeconds,
          }),
        })
        .optional(),
    })
    .default({}),
});
export type WebhookEnvelope = z.infer<typeof webhookEnvelope>;
export type WebhookPayment = NonNullable<WebhookEnvelope["payload"]["payment"]>["entity"];
export type WebhookSubscription = NonNullable<WebhookEnvelope["payload"]["subscription"]>["entity"];
