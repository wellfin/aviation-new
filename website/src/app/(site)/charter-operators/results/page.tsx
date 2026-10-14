import type { Metadata } from "next";
import { CharterResultsPage } from "@/components/charter/CharterPages";

export const metadata: Metadata = {
  title: "Charter Operators — Search Results",
  description: "Air charter operators matching your search, with addresses, phone numbers, email and websites.",
};

export default async function CharterOperatorResultsPage({ searchParams }: PageProps<"/charter-operators/results">) {
  return <CharterResultsPage kind="operator" searchParams={await searchParams} />;
}
