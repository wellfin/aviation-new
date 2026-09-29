import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnquiryDetail } from "@/components/account/enquiries/EnquiryDetail";

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export async function generateMetadata({ params }: PageProps<"/account/enquiries/[id]">): Promise<Metadata> {
  const { id } = await params;
  // Resolving the 404 here (before streaming starts) gives unknown ids a real 404 status.
  if (!OBJECT_ID.test(id)) notFound();
  return { title: "Enquiry", description: "Enquiry details and reply." };
}

export default async function EnquiryPage({ params }: PageProps<"/account/enquiries/[id]">) {
  const { id } = await params;
  if (!OBJECT_ID.test(id)) notFound();
  return <EnquiryDetail id={id} />;
}
