import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingPanel } from "@/components/account/billing/BillingPanel";

export const metadata: Metadata = {
  title: "Plan & billing",
  description: "Upgrade your listing to Pro or Ultra Pro, manage your subscription and view payments.",
};

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPanel />
    </Suspense>
  );
}
