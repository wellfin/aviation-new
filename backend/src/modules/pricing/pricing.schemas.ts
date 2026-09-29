import { z } from "zod";
import { PLAN_IDS } from "./pricing-plan.model.js";

export const planParams = z.object({ id: z.enum(PLAN_IDS) });

const price = z.number().min(0).max(100_000_000).multipleOf(0.01).nullable();
const razorpayId = z
  .string()
  .trim()
  .regex(/^plan_[A-Za-z0-9]{6,40}$/, "Use a Razorpay plan id (plan_…)")
  .nullable()
  .optional();

/** Full replacement of a plan (PUT = upsert). */
export const upsertPlanBody = z.object({
  name: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(200).default(""),
  monthlyPrice: price,
  yearlyPrice: price,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code")
    .default("INR"),
  highlighted: z.boolean().default(false),
  features: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
  cta: z.string().trim().min(2).max(60),
  active: z.boolean().default(true),
  /** Omitted keys keep the stored id; null removes it (so editing copy never drops billing links). */
  razorpayPlanIds: z.object({ monthly: razorpayId, yearly: razorpayId }).optional(),
  order: z.number().int().min(0).max(1000).default(0),
});

export type UpsertPlanInput = z.infer<typeof upsertPlanBody>;
