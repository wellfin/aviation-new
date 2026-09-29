import type { Metadata } from "next";
import { Suspense } from "react";
import { AdEditor } from "@/components/admin/ads/AdEditor";

export const metadata: Metadata = { title: "New ad" };

export default function AdminNewAdPage() {
  return (
    <Suspense>
      <AdEditor />
    </Suspense>
  );
}
