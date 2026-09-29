import type { Metadata } from "next";
import { LeadDetail } from "@/components/admin/leads/LeadDetail";

export const metadata: Metadata = { title: "Lead" };

export default async function AdminLeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  const { id } = await params;
  return <LeadDetail id={id} />;
}
