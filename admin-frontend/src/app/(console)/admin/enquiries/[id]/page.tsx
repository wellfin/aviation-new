import type { Metadata } from "next";
import { EnquiryDetail } from "@/components/admin/enquiries/EnquiryDetail";

export const metadata: Metadata = { title: "Enquiry" };

export default async function AdminEnquiryPage({ params }: PageProps<"/admin/enquiries/[id]">) {
  const { id } = await params;
  return <EnquiryDetail id={id} />;
}
