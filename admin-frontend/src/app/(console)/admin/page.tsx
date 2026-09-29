import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardClient } from "@/components/admin/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Directory activity: users, listings, reviews, enquiries and revenue over time.",
};

export default function AdminDashboardPage() {
  return (
    <Suspense>
      <DashboardClient />
    </Suspense>
  );
}
