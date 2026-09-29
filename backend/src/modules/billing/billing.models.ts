import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";

export const PAID_PLANS = ["pro", "ultra_pro"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

export const BILLING_CYCLES = ["monthly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** Mirrors Razorpay's subscription lifecycle. */
export const SUBSCRIPTION_STATUSES = ["created", "authenticated", "active", "pending", "halted", "cancelled", "completed", "expired"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Statuses in which the provider holds (or is about to hold) the paid tier; at most one per provider. */
export const LIVE_STATUSES: readonly SubscriptionStatus[] = ["authenticated", "active", "pending"];
/** Terminal statuses never transition back (out-of-order webhooks must not resurrect them). */
export const TERMINAL_STATUSES: readonly SubscriptionStatus[] = ["cancelled", "completed", "expired"];

export const PAYMENT_STATUSES = ["authorized", "captured", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const subscriptionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    plan: { type: String, enum: PAID_PLANS, required: true },
    billing: { type: String, enum: BILLING_CYCLES, required: true },
    razorpaySubscriptionId: { type: String, required: true, maxlength: 64 },
    razorpayPlanId: { type: String, required: true, maxlength: 64 },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, required: true, default: "created" },
    /** Per-cycle price in the smallest currency unit (paise). */
    amount: { type: Number, required: true, min: 0, validate: Number.isInteger },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    endedAt: { type: Date },
  },
  { timestamps: true },
);

subscriptionSchema.index({ razorpaySubscriptionId: 1 }, { unique: true });
subscriptionSchema.index({ user: 1, createdAt: -1 });
subscriptionSchema.index({ provider: 1, status: 1 });
subscriptionSchema.index({ status: 1, createdAt: -1 });

export type SubscriptionAttrs = InferSchemaType<typeof subscriptionSchema>;
export type SubscriptionDoc = HydratedDocument<SubscriptionAttrs>;
export const Subscription = model("Subscription", subscriptionSchema);

const paymentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    subscription: { type: Schema.Types.ObjectId, ref: "Subscription", required: true },
    plan: { type: String, enum: PAID_PLANS, required: true },
    razorpayPaymentId: { type: String, required: true, maxlength: 64 },
    razorpayInvoiceId: { type: String, maxlength: 64 },
    /** Smallest currency unit (paise). */
    amount: { type: Number, required: true, min: 0, validate: Number.isInteger },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    status: { type: String, enum: PAYMENT_STATUSES, required: true },
    method: { type: String, maxlength: 40 },
    errorDescription: { type: String, maxlength: 300 },
    paidAt: { type: Date, required: true },
  },
  { timestamps: true },
);

paymentSchema.index({ razorpayPaymentId: 1 }, { unique: true });
paymentSchema.index({ user: 1, paidAt: -1 });
paymentSchema.index({ paidAt: -1 });
paymentSchema.index({ status: 1, paidAt: 1 });

export type PaymentAttrs = InferSchemaType<typeof paymentSchema>;
export type PaymentDoc = HydratedDocument<PaymentAttrs>;
export const Payment = model("Payment", paymentSchema);

/** Processed webhook deliveries; the unique id makes Razorpay's retries idempotent. */
const webhookEventSchema = new Schema(
  {
    eventId: { type: String, required: true, maxlength: 100 },
    event: { type: String, required: true, maxlength: 60 },
    receivedAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false },
);

webhookEventSchema.index({ eventId: 1 }, { unique: true });
// Razorpay retries for ~24h; keep ids well beyond that window, then let them expire.
webhookEventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });

export const WebhookEvent = model("WebhookEvent", webhookEventSchema);
