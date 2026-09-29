import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { BillingTabs } from "@/components/admin/billing/BillingTabs";

export const metadata: Metadata = { title: "Billing" };

export default function AdminBillingPage() {
  return (
    <>
      <PageHeader title="Billing" description="Provider subscriptions and the payments Razorpay has reported." />
      <Suspense>
        <BillingTabs />
      </Suspense>
    </>
  );
}
