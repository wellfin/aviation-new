import type { Metadata } from "next";
import { CharterResultsPage } from "@/components/charter/CharterPages";

export const metadata: Metadata = {
  title: "Charter Brokers — Search Results",
  description: "Air charter brokers matching your search, with addresses, phone numbers, email and websites.",
};

export default async function CharterBrokerResultsPage({ searchParams }: PageProps<"/charter-brokers/results">) {
  return <CharterResultsPage kind="broker" searchParams={await searchParams} />;
}
