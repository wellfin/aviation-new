import type { Metadata } from "next";
import { Suspense } from "react";
import { AirportEditor } from "@/components/admin/airports/AirportEditor";

export const metadata: Metadata = { title: "New airport", description: "Add an airport to the database." };

export default function AdminNewAirportPage() {
  return (
    <Suspense>
      <AirportEditor />
    </Suspense>
  );
}
