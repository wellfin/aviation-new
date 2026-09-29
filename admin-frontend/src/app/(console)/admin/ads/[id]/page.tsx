import type { Metadata } from "next";
import { Suspense } from "react";
import { AdEditor } from "@/components/admin/ads/AdEditor";

export const metadata: Metadata = { title: "Edit ad" };

export default async function AdminEditAdPage({ params }: PageProps<"/admin/ads/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <AdEditor id={id} />
    </Suspense>
  );
}
