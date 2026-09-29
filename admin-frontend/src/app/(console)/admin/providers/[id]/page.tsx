import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProviderEditor } from "@/components/admin/providers/ProviderEditor";

export const metadata: Metadata = { title: "Edit listing", description: "Edit and moderate a provider listing." };

export default async function AdminProviderPage({ params }: PageProps<"/admin/providers/[id]">) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  return (
    <Suspense>
      <ProviderEditor id={id} />
    </Suspense>
  );
}
