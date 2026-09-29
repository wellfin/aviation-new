import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsList } from "@/components/account/ReviewsList";

export const metadata: Metadata = {
  title: "My reviews",
  description: "Reviews you've written and their moderation status.",
};

export default function ReviewsPage() {
  return (
    <Suspense>
      <ReviewsList />
    </Suspense>
  );
}
