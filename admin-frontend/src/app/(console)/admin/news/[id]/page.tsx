import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsEditor } from "@/components/admin/news/NewsEditor";

export const metadata: Metadata = { title: "Edit article" };

export default async function AdminEditNewsPage({ params }: PageProps<"/admin/news/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <NewsEditor id={id} />
    </Suspense>
  );
}
