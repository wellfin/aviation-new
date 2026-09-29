import type { Metadata } from "next";
import { Suspense } from "react";
import { SubscribersList } from "@/components/admin/newsletter/SubscribersList";

export const metadata: Metadata = { title: "Newsletter" };

export default function AdminNewsletterPage() {
  return (
    <Suspense>
      <SubscribersList />
    </Suspense>
  );
}
