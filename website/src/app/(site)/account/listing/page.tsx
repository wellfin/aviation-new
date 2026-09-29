import type { Metadata } from "next";
import { ListingManager } from "@/components/account/listing/ListingManager";

export const metadata: Metadata = {
  title: "My listing",
  description: "Create and edit your company listing in the Global Aviation Services Directory.",
};

export default function ListingPage() {
  return <ListingManager />;
}
