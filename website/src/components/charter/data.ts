import "server-only";
import { listAllProviders } from "@/lib/data/providers";
import type { Provider } from "@/lib/types";
import { CHARTER_KINDS, type CharterKind } from "./kinds";

/** All listed charter operators or brokers (optionally narrowed by the API-supported name/country filters). */
export async function loadCharterProviders(kind: CharterKind, query: { q?: string; country?: string } = {}): Promise<Provider[]> {
  return listAllProviders({ category: CHARTER_KINDS[kind].category, q: query.q, country: query.country, sort: "rating" });
}
