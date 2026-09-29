import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";

export const SUBSCRIBER_STATUSES = ["pending", "subscribed", "unsubscribed"] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

/**
 * Double opt-in newsletter subscriber. Confirm / unsubscribe links carry
 * random tokens; only their SHA-256 hashes are stored.
 */
const subscriberSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    status: { type: String, enum: SUBSCRIBER_STATUSES, required: true, default: "pending" },
    confirmTokenHash: { type: String, select: false },
    confirmTokenExpiresAt: { type: Date },
    confirmSentAt: { type: Date },
    unsubscribeTokenHash: { type: String, select: false },
    source: { type: String, trim: true, maxlength: 60, default: "website" },
    confirmedAt: { type: Date },
    unsubscribedAt: { type: Date },
  },
  { timestamps: true },
);

subscriberSchema.index({ email: 1 }, { unique: true });
subscriberSchema.index({ confirmTokenHash: 1 }, { unique: true, sparse: true });
subscriberSchema.index({ unsubscribeTokenHash: 1 }, { unique: true, sparse: true });
subscriberSchema.index({ status: 1, createdAt: -1 });
subscriberSchema.index({ createdAt: -1 });

export type SubscriberAttrs = InferSchemaType<typeof subscriberSchema>;
export type SubscriberDoc = HydratedDocument<SubscriberAttrs>;
export const Subscriber = model("NewsletterSubscriber", subscriberSchema);

export interface SubscriberDTO {
  id: string;
  email: string;
  status: SubscriberStatus;
  source: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toSubscriberDTO(s: SubscriberDoc): SubscriberDTO {
  return {
    id: s.id,
    email: s.email,
    status: s.status,
    source: s.source ?? "website",
    confirmedAt: s.confirmedAt?.toISOString() ?? null,
    unsubscribedAt: s.unsubscribedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
