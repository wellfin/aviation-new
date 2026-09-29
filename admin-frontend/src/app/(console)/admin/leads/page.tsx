import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { LeadsExportLink, LeadsList } from "@/components/admin/leads/LeadsList";

export const metadata: Metadata = { title: "Leads" };

export default function AdminLeadsPage() {
  return (
    <Suspense>
      <PageHeader title="Leads" description="Contact, demo, data-licence and advertising enquiries from the website forms." actions={<LeadsExportLink />} />
      <LeadsList />
    </Suspense>
  );
}
