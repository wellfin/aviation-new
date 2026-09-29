import "server-only";
import { listAllProviders } from "@/lib/data/providers";
import type { Provider } from "@/lib/types";

/** All listed air charter operators (optionally narrowed by the API-supported name/country filters). */
export async function loadCharterOperators(query: { q?: string; country?: string } = {}): Promise<Provider[]> {
  return listAllProviders({ category: "charter-operator", q: query.q, country: query.country, sort: "rating" });
}
