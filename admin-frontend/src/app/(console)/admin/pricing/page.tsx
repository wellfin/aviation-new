import type { Metadata } from "next";
import { Suspense } from "react";
import { PricingManager } from "@/components/admin/pricing/PricingManager";

export const metadata: Metadata = { title: "Pricing plans" };

export default function AdminPricingPage() {
  return (
    <Suspense>
      <PricingManager />
    </Suspense>
  );
}
