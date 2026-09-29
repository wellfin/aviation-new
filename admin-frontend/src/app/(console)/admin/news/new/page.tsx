import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsEditor } from "@/components/admin/news/NewsEditor";

export const metadata: Metadata = { title: "New article" };

export default function AdminNewNewsPage() {
  return (
    <Suspense>
      <NewsEditor />
    </Suspense>
  );
}
