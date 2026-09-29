import type { Metadata } from "next";
import { Suspense } from "react";
import { AirportsClient } from "@/components/admin/airports/AirportsClient";

export const metadata: Metadata = { title: "Airports", description: "Manage the airport database." };

export default function AdminAirportsPage() {
  return (
    <Suspense>
      <AirportsClient />
    </Suspense>
  );
}
