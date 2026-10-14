import type { Metadata } from "next";
import { CharterSearchPage } from "@/components/charter/CharterPages";

export const metadata: Metadata = {
  title: "Search Air Charter Brokers",
  description: "Find verified air charter brokers worldwide. Search by company name, location, aircraft type and safety certification.",
};

export default function CharterBrokersPage() {
  return <CharterSearchPage kind="broker" />;
}
