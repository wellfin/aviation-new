import { notFound } from "../../lib/errors.js";
import { PricingPlan, type PlanId, toInternalPricingPlan, toPricingPlanDTO, type InternalPricingPlan, type PricingPlanDTO } from "./pricing-plan.model.js";
import type { UpsertPlanInput } from "./pricing.schemas.js";

/** Active plans in display order, without any billing-provider identifiers. */
export async function listPublicPlans(): Promise<PricingPlanDTO[]> {
  const plans = await PricingPlan.find({ active: true }).sort({ order: 1, _id: 1 }).lean();
  return plans.map(toPricingPlanDTO);
}

export async function listAdminPlans(): Promise<InternalPricingPlan[]> {
  const plans = await PricingPlan.find().sort({ order: 1, _id: 1 }).lean();
  return plans.map(toInternalPricingPlan);
}

export async function getAdminPlan(id: PlanId): Promise<InternalPricingPlan> {
  const plan = await getPlanForBilling(id);
  if (!plan) throw notFound("Plan");
  return plan;
}

/**
 * For the billing module: the full internal plan (incl. Razorpay plan ids and
 * `active`) or null. Callers must check `active` and the relevant Razorpay id.
 */
export async function getPlanForBilling<T extends PlanId>(id: T): Promise<(InternalPricingPlan & { id: T }) | null> {
  const plan = await PricingPlan.findById(id).lean();
  return plan ? { ...toInternalPricingPlan(plan), id } : null;
}

type PlanUpdate = { $set: Record<string, unknown>; $unset?: Record<string, 1> };

function buildPlanUpdate(input: UpsertPlanInput): PlanUpdate {
  const update: PlanUpdate = {
    $set: {
      name: input.name,
      tagline: input.tagline,
      monthlyPrice: input.monthlyPrice,
      yearlyPrice: input.yearlyPrice,
      currency: input.currency,
      highlighted: input.highlighted,
      features: input.features,
      cta: input.cta,
      active: input.active,
      order: input.order,
    },
  };
  for (const cycle of ["monthly", "yearly"] as const) {
    const value = input.razorpayPlanIds?.[cycle];
    if (value === undefined) continue;
    if (value === null) update.$unset = { ...update.$unset, [`razorpayPlanIds.${cycle}`]: 1 };
    else update.$set[`razorpayPlanIds.${cycle}`] = value;
  }
  return update;
}

export async function upsertPlan(id: PlanId, input: UpsertPlanInput): Promise<{ plan: InternalPricingPlan; created: boolean }> {
  const existed = Boolean(await PricingPlan.exists({ _id: id }));
  const plan = await PricingPlan.findOneAndUpdate(
    { _id: id },
    buildPlanUpdate(input),
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();
  if (!plan) throw notFound("Plan");
  return { plan: toInternalPricingPlan(plan), created: !existed };
}
