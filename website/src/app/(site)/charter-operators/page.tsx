import type { Metadata } from "next";
import { CharterSearchPage } from "@/components/charter/CharterPages";

export const metadata: Metadata = {
  title: "Search Air Charter Operators",
  description: "Find verified air charter operators worldwide. Search by company name, location, aircraft type and safety certification.",
};

export default function CharterOperatorsPage() {
  return <CharterSearchPage kind="operator" />;
}
