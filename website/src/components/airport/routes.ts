import type { ServiceCategorySlug } from "@/lib/types";

export const AIRPORT_TABS = [
  { key: "info", label: "Airport Information" },
  { key: "services", label: "Airport Services" },
  { key: "runways", label: "Runways" },
  { key: "communication", label: "Airport Communication" },
  { key: "fire", label: "Fire/RFFS" },
  { key: "nearby", label: "Nearby Airport" },
] as const;

export type AirportTab = (typeof AIRPORT_TABS)[number]["key"];

export function parseTab(value: string | undefined): AirportTab {
  return AIRPORT_TABS.some((t) => t.key === value) ? (value as AirportTab) : "info";
}

/** Canonical airport URL (lowercase ICAO) with optional tab / service selection. */
export function airportHref(icao: string, opts: { tab?: AirportTab; service?: ServiceCategorySlug | "all"; hash?: string } = {}): string {
  const sp = new URLSearchParams();
  if (opts.service) sp.set("service", opts.service);
  else if (opts.tab && opts.tab !== "info") sp.set("tab", opts.tab);
  const qs = sp.toString();
  return `/airports/${icao.toLowerCase()}${qs ? `?${qs}` : ""}${opts.hash ? `#${opts.hash}` : ""}`;
}

export const AIRPORT_TYPE_LABEL: Record<string, string> = {
  large_airport: "Large airport",
  medium_airport: "Medium airport",
  small_airport: "Small airport",
};
