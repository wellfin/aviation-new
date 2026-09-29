import "server-only";
import { config } from "@/lib/config";
import { PROVIDERS } from "@/lib/mock/providers";
import type { Paginated, Provider, ProviderQuery, Review } from "@/lib/types";
import { paginate } from "@/lib/utils";
import { airportParam, apiGet, buildQuery, clampPage, clampPageSize, clampQuery, countryParam, SLUG_RE } from "./http";

const TIERS = new Set<string>(["basic", "pro", "ultra_pro"]);
const SORTS = new Set<string>(["rating", "reviews", "name", "newest"]);

/** Drops/clamps values the API would reject (see http.ts). */
function apiProviderQuery(query: ProviderQuery) {
  // Categories are admin-managed: forward any well-formed slug (unknown ones simply match nothing).
  const category = query.category && query.category !== "all" && SLUG_RE.test(query.category) ? query.category : undefined;
  return {
    q: clampQuery(query.q),
    category,
    tier: query.tier && TIERS.has(query.tier) ? query.tier : undefined,
    country: countryParam(query.country),
    airport: airportParam(query.airport),
    sort: query.sort && SORTS.has(query.sort) ? query.sort : undefined,
    page: clampPage(query.page),
    pageSize: clampPageSize(query.pageSize, 9),
  };
}

const TIER_WEIGHT: Record<Provider["tier"], number> = { ultra_pro: 3, pro: 2, basic: 1 };

function matches(p: Provider, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [p.name, p.summary, p.city, p.country, p.category, ...p.airports.flatMap((a) => [a.icao, a.iata, a.name, a.city])]
    .join(" ")
    .toLowerCase();
  return needle.split(/\s+/).every((t) => hay.includes(t));
}

function queryMock(query: ProviderQuery): Paginated<Provider> {
  const { q = "", category = "all", tier = "all", country, airport, sort = "rating", page = 1, pageSize = 9 } = query;
  let list = PROVIDERS.filter((p) => matches(p, q));
  if (category !== "all") list = list.filter((p) => p.category === category);
  if (tier !== "all") list = list.filter((p) => p.tier === tier);
  if (country) list = list.filter((p) => p.countryCode.toLowerCase() === country.toLowerCase());
  if (airport) {
    const code = airport.toUpperCase();
    list = list.filter((p) => p.airports.some((a) => a.icao === code || a.iata === code));
  }
  list = [...list].sort((a, b) => {
    // Paid tiers are always ranked first, as in the design.
    const tierDiff = TIER_WEIGHT[b.tier] - TIER_WEIGHT[a.tier];
    if (tierDiff !== 0) return tierDiff;
    switch (sort) {
      case "reviews":
        return b.reviewCount - a.reviewCount;
      case "name":
        return a.name.localeCompare(b.name);
      case "newest":
        return b.id.localeCompare(a.id);
      default:
        return b.rating - a.rating;
    }
  });
  return paginate(list, page, pageSize);
}

export async function listProviders(query: ProviderQuery = {}): Promise<Paginated<Provider>> {
  if (config.DATA_SOURCE === "mock") return queryMock(query);
  const result = await apiGet<Paginated<Provider>>(`/providers${buildQuery(apiProviderQuery(query))}`);
  return result ?? { items: [], total: 0, page: 1, pageSize: query.pageSize ?? 9, totalPages: 1 };
}

export async function getProvider(slug: string): Promise<Provider | null> {
  if (config.DATA_SOURCE === "mock") return PROVIDERS.find((p) => p.slug === slug) ?? null;
  if (!SLUG_RE.test(slug)) return null;
  return apiGet<Provider>(`/providers/${encodeURIComponent(slug)}`);
}

export async function getRelatedProviders(provider: Provider, limit = 4): Promise<Provider[]> {
  if (config.DATA_SOURCE === "mock") {
    return PROVIDERS.filter((p) => p.slug !== provider.slug && (p.category === provider.category || p.countryCode === provider.countryCode)).slice(0, limit);
  }
  try {
    return (await apiGet<Provider[]>(`/providers/${encodeURIComponent(provider.slug)}/related${buildQuery({ limit })}`)) ?? [];
  } catch {
    // A sidebar extra — the profile still renders without it.
    return [];
  }
}

/** Approved reviews for a profile, newest first (the profile payload only embeds the latest few). */
export async function listProviderReviews(provider: Provider, page = 1, pageSize = 4): Promise<Paginated<Review>> {
  if (config.DATA_SOURCE === "mock") return paginate(provider.reviews, page, pageSize);
  const result = await apiGet<Paginated<Review>>(
    `/providers/${encodeURIComponent(provider.slug)}/reviews${buildQuery({ page: clampPage(page), pageSize: clampPageSize(pageSize, 4) })}`,
    // Uncached: a newly approved review should show up on the next visit.
    { revalidate: 0 },
  );
  return result ?? { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
}

/** The API caps pageSize at 100; this walks pages for views that need a complete (bounded) list. */
const API_MAX_PAGE_SIZE = 100;
const MAX_PAGES = 10;

export async function listAllProviders(query: Omit<ProviderQuery, "page" | "pageSize"> = {}): Promise<Provider[]> {
  const first = await listProviders({ ...query, page: 1, pageSize: API_MAX_PAGE_SIZE });
  const pages = Math.min(first.totalPages, MAX_PAGES);
  if (pages <= 1) return first.items;
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => listProviders({ ...query, page: i + 2, pageSize: API_MAX_PAGE_SIZE })),
  );
  return [first, ...rest].flatMap((r) => r.items);
}

export async function getProvidersAtAirport(icao: string, category?: string): Promise<Provider[]> {
  return listAllProviders({ airport: icao, category: (category as ProviderQuery["category"]) ?? "all" });
}
