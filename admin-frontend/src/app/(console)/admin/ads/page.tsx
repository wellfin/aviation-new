import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { AdsList } from "@/components/admin/ads/AdsList";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Advertising" };

export default function AdminAdsPage() {
  return (
    <>
      <PageHeader
        title="Advertising"
        description="Ads served in each placement, with impressions, clicks and click-through rate."
        actions={
          <ButtonLink href="/admin/ads/new" size="sm">
            <Plus className="size-4" aria-hidden /> New ad
          </ButtonLink>
        }
      />
      <Suspense>
        <AdsList />
      </Suspense>
    </>
  );
}
