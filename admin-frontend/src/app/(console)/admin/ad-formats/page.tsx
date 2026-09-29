import type { Metadata } from "next";
import { AdFormatsManager } from "@/components/admin/ad-formats/AdFormatsManager";

export const metadata: Metadata = { title: "Ad packages" };

export default function AdminAdFormatsPage() {
  return <AdFormatsManager />;
}
