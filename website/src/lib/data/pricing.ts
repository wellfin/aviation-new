import "server-only";
import { config } from "@/lib/config";
import { PRICING_PLANS } from "@/lib/mock/pricing";
import type { PricingPlan } from "@/lib/types";
import { apiGet } from "./http";

export async function listPricingPlans(): Promise<PricingPlan[]> {
  if (config.DATA_SOURCE === "mock") return PRICING_PLANS;
  return (await apiGet<PricingPlan[]>("/pricing/plans", { revalidate: 300 })) ?? [];
}
