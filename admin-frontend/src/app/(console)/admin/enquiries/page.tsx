import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { EnquiriesList } from "@/components/admin/enquiries/EnquiriesList";

export const metadata: Metadata = { title: "Enquiries" };

export default function AdminEnquiriesPage() {
  return (
    <>
      <PageHeader title="Enquiries" description="Every enquiry sent to providers through their listings, including aircraft-fleet charter requests." />
      <Suspense>
        <EnquiriesList />
      </Suspense>
    </>
  );
}
