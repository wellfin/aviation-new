import { type InferSchemaType, Schema, model } from "mongoose";

export const PLAN_IDS = ["basic", "pro", "ultra_pro", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** The plan key (basic, pro, …) is the document _id: there is exactly one document per plan. */
const pricingPlanSchema = new Schema(
  {
    _id: { type: String, enum: PLAN_IDS, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    tagline: { type: String, trim: true, maxlength: 200, default: "" },
    /** Price in major currency units; null means "contact us" (e.g. enterprise). */
    monthlyPrice: { type: Number, min: 0, default: null },
    yearlyPrice: { type: Number, min: 0, default: null },
    currency: { type: String, required: true, uppercase: true, trim: true, minlength: 3, maxlength: 3, default: "INR" },
    highlighted: { type: Boolean, default: false },
    features: { type: [String], default: [] },
    cta: { type: String, required: true, trim: true, maxlength: 60 },
    active: { type: Boolean, default: true },
    /** Razorpay plan ids used by billing. Internal: never serialised to public responses. */
    razorpayPlanIds: {
      monthly: { type: String, trim: true, maxlength: 64 },
      yearly: { type: String, trim: true, maxlength: 64 },
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

pricingPlanSchema.index({ active: 1, order: 1 });

export type PricingPlanAttrs = InferSchemaType<typeof pricingPlanSchema>;
export const PricingPlan = model("PricingPlan", pricingPlanSchema);

/** Public shape — exactly the frontend's `PricingPlan`. */
export interface PricingPlanDTO {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  /** ISO 4217 code the prices are expressed in (whole units, e.g. rupees). */
  currency: string;
  highlighted: boolean;
  features: string[];
  cta: string;
}

/** Everything billing and admins need, including Razorpay ids. */
export interface InternalPricingPlan extends PricingPlanDTO {
  active: boolean;
  order: number;
  razorpayPlanIds: { monthly: string | null; yearly: string | null };
  updatedAt: string | null;
}

type PlanLike = PricingPlanAttrs & { _id: PlanId; updatedAt?: Date };

export function toPricingPlanDTO(p: PlanLike): PricingPlanDTO {
  return {
    id: p._id,
    name: p.name,
    tagline: p.tagline ?? "",
    monthlyPrice: p.monthlyPrice ?? null,
    yearlyPrice: p.yearlyPrice ?? null,
    currency: p.currency,
    highlighted: p.highlighted ?? false,
    features: [...(p.features ?? [])],
    cta: p.cta,
  };
}

export function toInternalPricingPlan(p: PlanLike): InternalPricingPlan {
  return {
    ...toPricingPlanDTO(p),
    active: p.active ?? true,
    order: p.order ?? 0,
    razorpayPlanIds: { monthly: p.razorpayPlanIds?.monthly ?? null, yearly: p.razorpayPlanIds?.yearly ?? null },
    updatedAt: p.updatedAt?.toISOString() ?? null,
  };
}
