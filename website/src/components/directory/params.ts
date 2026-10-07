import type { ProviderSort, ProviderTier, ServiceCategory, ServiceCategorySlug } from "@/lib/types";
import { firstParam, toInt } from "@/lib/utils";
import { isDesignCategory } from "@/components/categories/design-categories";

export type DirectoryView = "grid" | "list";

export interface DirectoryParams {
  q: string;
  category: ServiceCategorySlug | "all";
  sort: ProviderSort;
  view: DirectoryView;
  tier: ProviderTier | "all";
  page: number;
}

/** How many categories fit in the pill bar at 1440px; the rest go under "More Services". */
const PILL_COUNT = 9;

/**
 * Splits the admin-ordered catalogue into filter pills and the "More Services" menu. Only the
 * design's categories appear; providers of categories added later are listed under "All Services".
 */
export function splitCategories(all: ServiceCategory[]): { primary: ServiceCategory[]; more: ServiceCategory[] } {
  const categories = all.filter(isDesignCategory);
  const menu = categories.filter((c) => c.showInMenu);
  return { primary: menu.slice(0, PILL_COUNT), more: [...menu.slice(PILL_COUNT), ...categories.filter((c) => !c.showInMenu)] };
}

export const SORT_OPTIONS: Array<{ value: ProviderSort; label: string }> = [
  { value: "rating", label: "Rating" },
  { value: "reviews", label: "Reviews" },
  { value: "name", label: "Name" },
  { value: "newest", label: "Newest" },
];

export const TIER_OPTIONS: Array<{ value: ProviderTier | "all"; label: string }> = [
  { value: "all", label: "All Tiers" },
  { value: "ultra_pro", label: "Ultra Pro" },
  { value: "pro", label: "Pro" },
  { value: "basic", label: "Basic" },
];

type RawParams = Record<string, string | string[] | undefined>;

export function parseDirectoryParams(sp: RawParams, categories: ServiceCategory[]): DirectoryParams {
  const category = firstParam(sp.category);
  const sort = firstParam(sp.sort);
  const tier = firstParam(sp.tier);
  return {
    q: (firstParam(sp.q) ?? "").trim(),
    category: categories.some((c) => c.slug === category) ? (category as ServiceCategorySlug) : "all",
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as ProviderSort) : "rating",
    view: firstParam(sp.view) === "list" ? "list" : "grid",
    tier: TIER_OPTIONS.some((o) => o.value === tier) ? (tier as ProviderTier | "all") : "all",
    page: toInt(sp.page, 1),
  };
}

/** Query-string values for the current state, omitting defaults so URLs stay short. */
export function toQuery(p: Omit<DirectoryParams, "page">): Record<string, string | undefined> {
  return {
    q: p.q || undefined,
    category: p.category === "all" ? undefined : p.category,
    tier: p.tier === "all" ? undefined : p.tier,
    sort: p.sort === "rating" ? undefined : p.sort,
    view: p.view === "grid" ? undefined : p.view,
  };
}

/** Builds a /directory URL from the current params with some values overridden (page resets to 1). */
export function directoryHref(p: DirectoryParams, patch: Partial<Omit<DirectoryParams, "page">>): string {
  const query = toQuery({ ...p, ...patch });
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `/directory?${qs}` : "/directory";
}
