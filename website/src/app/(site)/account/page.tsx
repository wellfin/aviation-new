import type { Metadata } from "next";
import { AccountOverview } from "@/components/account/AccountOverview";

export const metadata: Metadata = {
  title: "My account",
  description: "Your Global Aviation Services Directory account — profile, saved providers, reviews and business tools.",
};

export default function AccountPage() {
  return <AccountOverview />;
}
