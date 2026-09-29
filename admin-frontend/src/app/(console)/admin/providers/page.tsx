import type { Metadata } from "next";
import { Suspense } from "react";
import { ProvidersClient } from "@/components/admin/providers/ProvidersClient";

export const metadata: Metadata = { title: "Providers", description: "Moderate, curate and edit provider listings." };

export default function AdminProvidersPage() {
  return (
    <Suspense>
      <ProvidersClient />
    </Suspense>
  );
}
