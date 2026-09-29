import type { Provider } from "@/lib/types";
import { firstParam, toInt } from "@/lib/utils";

export const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"] as const;
export type Continent = (typeof CONTINENTS)[number];

/** ISO country → continent, for the "Location" step (Middle East is grouped under Asia, as in the airport data). */
const CONTINENT_BY_COUNTRY: Record<string, Continent> = {
  US: "North America", CA: "North America", MX: "North America", BS: "North America", PA: "North America",
  BR: "South America", AR: "South America", CL: "South America", CO: "South America", PE: "South America",
  GB: "Europe", IE: "Europe", FR: "Europe", DE: "Europe", CH: "Europe", AT: "Europe", IT: "Europe", ES: "Europe", PT: "Europe",
  NL: "Europe", BE: "Europe", LU: "Europe", MT: "Europe", MC: "Europe", DK: "Europe", SE: "Europe", NO: "Europe", FI: "Europe",
  PL: "Europe", CZ: "Europe", GR: "Europe", TR: "Europe", RU: "Europe",
  AE: "Asia", SA: "Asia", QA: "Asia", BH: "Asia", OM: "Asia", KW: "Asia", IL: "Asia", IN: "Asia", SG: "Asia", HK: "Asia",
  CN: "Asia", JP: "Asia", KR: "Asia", TH: "Asia", MY: "Asia", ID: "Asia", PH: "Asia", VN: "Asia",
  AU: "Oceania", NZ: "Oceania", FJ: "Oceania",
  ZA: "Africa", EG: "Africa", MA: "Africa", NG: "Africa", KE: "Africa", ET: "Africa", TZ: "Africa",
};

export function continentOf(countryCode: string): Continent | undefined {
  return CONTINENT_BY_COUNTRY[countryCode.toUpperCase()];
}

export const AIRCRAFT_TYPES = [
  { value: "private-jet", label: "Private Jet" },
  { value: "air-ambulance", label: "Air Ambulance" },
  { value: "cargo", label: "Cargo Charter" },
  { value: "helicopter", label: "Helicopter Charter" },
  { value: "group", label: "Group Charter" },
] as const;
export type AircraftType = (typeof AIRCRAFT_TYPES)[number]["value"];

export const CERTIFICATIONS = [
  { value: "wyvern", label: "Wyvern" },
  { value: "argus", label: "Argus" },
  { value: "is-bao", label: "IS-BAO" },
  { value: "other", label: "Other Certificate" },
] as const;
export type CertificationFilter = (typeof CERTIFICATIONS)[number]["value"];

export interface CharterParams {
  q: string;
  continent?: Continent;
  country?: string;
  state: string;
  city?: string;
  types: AircraftType[];
  certs: CertificationFilter[];
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

function many(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((v) => v.split(",")).filter(Boolean);
}

export function parseCharterParams(sp: RawParams): CharterParams {
  const continent = firstParam(sp.continent);
  const country = firstParam(sp.country)?.toUpperCase();
  return {
    q: (firstParam(sp.q) ?? "").trim(),
    continent: CONTINENTS.find((c) => c === continent),
    country: country && /^[A-Z]{2}$/.test(country) ? country : undefined,
    state: (firstParam(sp.state) ?? "").trim(),
    city: firstParam(sp.city)?.trim() || undefined,
    types: many(sp.type).filter((t): t is AircraftType => AIRCRAFT_TYPES.some((a) => a.value === t)),
    certs: many(sp.cert).filter((c): c is CertificationFilter => CERTIFICATIONS.some((a) => a.value === c)),
    page: toInt(sp.page, 1),
  };
}

/** Query-string values for pagination links. */
export function charterQuery(p: CharterParams): Record<string, string | undefined> {
  return {
    q: p.q || undefined,
    continent: p.continent,
    country: p.country,
    state: p.state || undefined,
    city: p.city,
    type: p.types.join(",") || undefined,
    cert: p.certs.join(",") || undefined,
  };
}

export function hasCriteria(p: CharterParams): boolean {
  return Boolean(p.q || p.continent || p.country || p.state || p.city || p.types.length || p.certs.length);
}

const text = (p: Provider) => [p.summary, ...p.services.map((s) => `${s.name} ${s.description}`)].join(" ").toLowerCase();

function offersType(p: Provider, type: AircraftType): boolean {
  switch (type) {
    case "private-jet":
      return p.fleet.some((a) => a.category.includes("Jet") || a.category === "Ultra Long Range") || text(p).includes("private jet");
    case "air-ambulance":
      return text(p).includes("air ambulance");
    case "cargo":
      return text(p).includes("cargo");
    case "helicopter":
      return p.fleet.some((a) => a.category === "Helicopter") || text(p).includes("helicopter");
    case "group":
      return p.fleet.some((a) => a.seats >= 12) || text(p).includes("group");
  }
}

function holdsCert(p: Provider, cert: CertificationFilter): boolean {
  const names = p.certifications.map((c) => c.name.toLowerCase());
  const known = ["wyvern", "argus", "is-bao"];
  if (cert === "other") return names.some((n) => !known.some((k) => n.includes(k)));
  return names.some((n) => n.includes(cert));
}

/**
 * Criteria the provider API does not filter on (continent, state, city, aircraft type,
 * certification) are applied here. Any selected aircraft type / certification may match.
 */
export function matchesCharterFilters(p: Provider, f: CharterParams): boolean {
  if (f.continent && continentOf(p.countryCode) !== f.continent) return false;
  if (f.city && p.city.toLowerCase() !== f.city.toLowerCase()) return false;
  if (f.state && !`${p.contact.address} ${p.city}`.toLowerCase().includes(f.state.toLowerCase())) return false;
  if (f.types.length && !f.types.some((t) => offersType(p, t))) return false;
  if (f.certs.length && !f.certs.some((c) => holdsCert(p, c))) return false;
  return true;
}

export interface LocationOption {
  code: string;
  name: string;
  continent?: Continent;
  cities: string[];
}

/** Country / city options for the search form, derived from the operators we actually list. */
export function buildLocationOptions(providers: Provider[]): LocationOption[] {
  const byCountry = new Map<string, LocationOption>();
  for (const p of providers) {
    const entry = byCountry.get(p.countryCode) ?? { code: p.countryCode, name: p.country, continent: continentOf(p.countryCode), cities: [] };
    if (!entry.cities.includes(p.city)) entry.cities.push(p.city);
    byCountry.set(p.countryCode, entry);
  }
  return [...byCountry.values()]
    .map((c) => ({ ...c, cities: [...c.cities].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
