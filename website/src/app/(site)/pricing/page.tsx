import type { Metadata } from "next";
import { AdBanner } from "@/components/ads/AdBanner";
import { PlanCard } from "@/components/pricing/PlanCard";
import { getAdvertisement } from "@/lib/data/content";
import { listPricingPlans } from "@/lib/data/pricing";
import { orFallback } from "@/lib/data/safe";

export const metadata: Metadata = {
  title: "Pricing — Simple, Transparent Aviation Pricing",
  description: "List your aviation business on the Global Aviation Services Directory. Free Basic listings, Pro and Ultra Pro plans. No hidden fees, cancel anytime.",
};

export default async function PricingPage() {
  const [plans, banner] = await Promise.all([orFallback(listPricingPlans(), []), getAdvertisement("header-banner")]);

  return (
    <div className="bg-[#f7fafc]">
      <section className="bg-header-gradient px-4 pt-11 pb-[68px] text-center md:px-6">
        <h1 className="text-[36px] leading-[1] font-extrabold tracking-[-0.96px] text-white md:text-[48px]">
          Simple, Transparent
          <span className="text-brand-gradient block pt-1 pb-1.5 md:pt-0">Aviation Pricing</span>
        </h1>
        <p className="mx-auto max-w-[640px] pt-2.5 text-base leading-7 text-white/60 md:text-lg">No hidden fees. No surprises. Cancel anytime.</p>
      </section>

      <div className="mx-auto -mt-8 max-w-[1200px] px-4 pb-8 md:px-6">
        {plans.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        ) : (
          <p className="rounded-[20px] bg-white p-10 text-center text-muted shadow-card">Plans are temporarily unavailable. Please check back shortly.</p>
        )}
      </div>

      <AdBanner ad={banner} height="h-[72px] sm:h-[120px] md:h-[222px]" className="pb-9" />
    </div>
  );
}
