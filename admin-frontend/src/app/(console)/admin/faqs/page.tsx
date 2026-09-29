import type { Metadata } from "next";
import { Suspense } from "react";
import { FaqsManager } from "@/components/admin/faqs/FaqsManager";

export const metadata: Metadata = { title: "FAQs" };

export default function AdminFaqsPage() {
  return (
    <Suspense>
      <FaqsManager />
    </Suspense>
  );
}
