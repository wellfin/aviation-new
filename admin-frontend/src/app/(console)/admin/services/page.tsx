import type { Metadata } from "next";
import { Suspense } from "react";
import { ServicesClient } from "@/components/admin/services/ServicesClient";

export const metadata: Metadata = { title: "Services", description: "Manage the service categories used by listings." };

export default function AdminServicesPage() {
  return (
    <Suspense>
      <ServicesClient />
    </Suspense>
  );
}
