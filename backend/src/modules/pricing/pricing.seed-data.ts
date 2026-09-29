import type { PlanId } from "./pricing-plan.model.js";

export interface PlanSeed {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  highlighted: boolean;
  features: string[];
  cta: string;
}

/** Plans copied from website/src/lib/mock/pricing.ts (array order = display order). Prices in INR. */
export const PRICING_SEED: PlanSeed[] = [
  {
    id: "basic",
    name: "Basic",
    tagline: "Perfect for getting started",
    monthlyPrice: 0,
    yearlyPrice: 0,
    highlighted: false,
    features: ["Basic listing", "Email support", "Standard placement"],
    cta: "Get Listed Free",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For growing aviation businesses",
    monthlyPrice: 5,
    yearlyPrice: 49,
    highlighted: true,
    features: ["Enhanced Company profile", "Company Logo Displayed", "Option to Add Additional Details", "Priority Placement", "Pro Badge", "Newsletter Publishing", "Brochure download", "Email support", "Social Media Presence"],
    cta: "Start Pro Plan",
  },
  {
    id: "ultra_pro",
    name: "Ultra Pro",
    tagline: "For enterprise aviation companies",
    monthlyPrice: 10,
    yearlyPrice: 99,
    highlighted: false,
    features: ["Full-featured premium profile", "#1 Priority placement", "Ultra Pro badge", "Verified / Tick", "Dedicated Page", "Company Introduction", "Airports & Services", "Award And Certification", "Brochure Download", "Social Media Presence", "Gallery", "Customer Feedback", "Service Request Form", "Newsletter Publishing", "Email Support"],
    cta: "Go Ultra Pro",
  },
];
