import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsClient } from "@/components/admin/reviews/ReviewsClient";

export const metadata: Metadata = { title: "Reviews", description: "Moderate provider reviews." };

export default function AdminReviewsPage() {
  return (
    <Suspense>
      <ReviewsClient />
    </Suspense>
  );
}
