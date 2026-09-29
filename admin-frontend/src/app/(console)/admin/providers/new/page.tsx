import type { Metadata } from "next";
import { Suspense } from "react";
import { ProviderEditor } from "@/components/admin/providers/ProviderEditor";

export const metadata: Metadata = { title: "New listing", description: "Create a provider listing." };

export default function AdminNewProviderPage() {
  return (
    <Suspense>
      <ProviderEditor />
    </Suspense>
  );
}
