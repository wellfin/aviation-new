import type { Metadata } from "next";
import { Suspense } from "react";
import { EnquiriesInbox } from "@/components/account/enquiries/EnquiriesInbox";

export const metadata: Metadata = {
  title: "Enquiries",
  description: "Quote requests and questions sent from your public profile.",
};

export default function EnquiriesPage() {
  return (
    <Suspense>
      <EnquiriesInbox />
    </Suspense>
  );
}
