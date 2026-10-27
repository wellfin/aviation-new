import Link from "next/link";
import { Fragment } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AdBanner } from "@/components/ads/AdBanner";
import { SidebarAd } from "@/components/ads/SidebarAd";
import { SponsoredStrip } from "@/components/ads/SponsoredStrip";
import { EmptyResults } from "@/components/directory/EmptyResults";
import { Pagination } from "@/components/ui/Pagination";
import { getAdvertisement } from "@/lib/data/content";
import type { Provider } from "@/lib/types";
import { paginate } from "@/lib/utils";
import { CharterHero } from "./CharterHero";
import { ProviderRow } from "@/components/airport/ProviderRow";
import { CharterSearchForm } from "./CharterSearchForm";
import { SponsoredCard } from "./SponsoredCard";
import { loadCharterProviders } from "./data";
import { charterQuery, hasCriteria, matchesCharterFilters, parseCharterParams } from "./filters";
import { CHARTER_KINDS, type CharterKind } from "./kinds";

/** Seven listings a page, the sponsored strip after the fifth (as drawn in the design). */
const PAGE_SIZE = 7;
const AD_AFTER = 5;
const TIER_ORDER = { ultra_pro: 0, pro: 1, basic: 2 } as const;
/** Charter operator results (Figma): three cards a page — one Ultra Pro, one Pro, one Basic. */
const OPERATOR_PAGE_SIZE = 3;

/**
 * Charter operator order: listings taken in turns from Ultra Pro, Pro and Basic (a plan that runs out is
 * skipped), so each page of three shows one of each while they last. Within a plan, listings with a
 * logo come first, then the API's rating order.
 */
function onePerPlan(providers: Provider[]): Provider[] {
  const byPlan = (["ultra_pro", "pro", "basic"] as const).map((tier) =>
    providers.filter((p) => p.tier === tier).sort((a, b) => Number(Boolean(b.logo)) - Number(Boolean(a.logo))),
  );
  const out: Provider[] = [];
  for (let i = 0; out.length < providers.length; i++) for (const plan of byPlan) if (plan[i]) out.push(plan[i]);
  return out;
}

async function charterAds() {
  const [bannerAd, sidebarAd, stripAd] = await Promise.all([getAdvertisement("header-banner"), getAdvertisement("sidebar"), getAdvertisement("sponsored-strip")]);
  return { bannerAd, sidebarAd, stripAd };
}

/** "Search Air Charter Operators / Brokers" page: hero, the four-step search form and the side ads. */
export async function CharterSearchPage({ kind }: { kind: CharterKind }) {
  const k = CHARTER_KINDS[kind];
  const { bannerAd, sidebarAd, stripAd } = await charterAds();
  return (
    <>
      <AdBanner ad={bannerAd} className="pt-6" />
      <CharterHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Directory", href: "/directory" }, { label: k.title }]}
        title={`Search Air ${k.title}`}
        subtitle={`Find verified air charter ${k.many} worldwide. Search by location, aircraft type, and company name.`}
      />
      <AdBanner ad={bannerAd} className="pt-6" />

      <div className="container-site grid gap-8 pt-14 pb-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,890px)_429px] xl:justify-between">
        <CharterSearchForm kind={kind} />
        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <SidebarAd ad={sidebarAd} className="min-h-[320px] lg:min-h-[467px]" />
          <SponsoredCard ad={stripAd} />
        </div>
      </div>

      <AdBanner ad={bannerAd} height="h-[150px] sm:h-[222px]" className="pt-6 pb-8" />
    </>
  );
}

/** Results for the charter search: matching listings with contacts, a sponsored strip and pagination. */
export async function CharterResultsPage({ kind, searchParams }: { kind: CharterKind; searchParams: Record<string, string | string[] | undefined> }) {
  const k = CHARTER_KINDS[kind];
  const filters = parseCharterParams(searchParams);
  const [providers, { bannerAd, sidebarAd, stripAd }] = await Promise.all([loadCharterProviders(kind, { q: filters.q, country: filters.country }), charterAds()]);
  const operators = kind === "operator";
  const matching = providers.filter((p) => matchesCharterFilters(p, filters));
  const result = paginate(
    // Operators: one listing of each plan per page. Brokers: Ultra Pro first, then Pro, then Basic, each plan in the API's rating order.
    operators ? onePerPlan(matching) : matching.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]),
    filters.page,
    operators ? OPERATOR_PAGE_SIZE : PAGE_SIZE,
  );
  const query = charterQuery(filters);
  const modifyHref = `${k.basePath}?${new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => Boolean(e[1]))).toString()}`;

  return (
    <>
      <AdBanner ad={bannerAd} className="pt-6" />
      <CharterHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Directory", href: "/directory" },
          { label: k.title, href: k.basePath },
          { label: "Results" },
        ]}
        title={k.title}
      />

      <div className="container-site grid gap-8 pt-6 pb-8 xl:grid-cols-[314px_minmax(0,660px)_314px] xl:justify-between">
        {/* Two tall ads down each side of the list (Figma). */}
        <div className="hidden flex-col gap-5 xl:flex">
          <SidebarAd ad={sidebarAd} className="min-h-[420px] flex-1" />
          <SidebarAd ad={sidebarAd} className="min-h-[420px] flex-1" />
        </div>

        <section aria-labelledby="charter-results-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
            <p id="charter-results-heading" className="text-sm text-muted" aria-live="polite">
              <strong className="font-bold text-ink">{result.total}</strong> {result.total === 1 ? k.one : k.many} found
              {filters.q && <> for &ldquo;{filters.q}&rdquo;</>}
            </p>
            <Link href={modifyHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <SlidersHorizontal className="size-4" aria-hidden />
              {hasCriteria(filters) ? "Modify search" : "Refine search"}
            </Link>
          </div>

          {result.items.length === 0 ? (
            <EmptyResults
              title={`No charter ${k.many} found`}
              message={`No ${k.many} match your search. Try removing a filter, choosing a different location, or searching by company name only.`}
              resetHref={k.basePath}
              resetLabel="New search"
            />
          ) : (
            <div className="space-y-[5px]">
              {result.items.map((provider, i) => (
                <Fragment key={provider.id}>
                  <ProviderRow provider={provider} />
                  {i === Math.min(AD_AFTER, result.items.length) - 1 && <SponsoredStrip ad={stripAd} className="my-2" />}
                </Fragment>
              ))}
            </div>
          )}

          <Pagination page={result.page} totalPages={result.totalPages} basePath={`${k.basePath}/results`} params={query} className="pt-9" />
        </section>

        <div className="hidden flex-col gap-5 xl:flex">
          <SidebarAd ad={sidebarAd} className="min-h-[420px] flex-1" />
          <SidebarAd ad={sidebarAd} className="min-h-[420px] flex-1" />
        </div>
      </div>

      <AdBanner ad={bannerAd} height="h-[150px] sm:h-[222px]" className="pt-6 pb-8" />
    </>
  );
}
