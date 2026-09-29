import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { SlidersHorizontal } from "lucide-react";
import { AdBanner } from "@/components/ads/AdBanner";
import { SidebarAd } from "@/components/ads/SidebarAd";
import { SponsoredStrip } from "@/components/ads/SponsoredStrip";
import { CharterHero } from "@/components/charter/CharterHero";
import { CharterResult } from "@/components/charter/CharterResult";
import { SponsoredCard } from "@/components/charter/SponsoredCard";
import { loadCharterOperators } from "@/components/charter/data";
import { charterQuery, hasCriteria, matchesCharterFilters, parseCharterParams } from "@/components/charter/filters";
import { EmptyResults } from "@/components/directory/EmptyResults";
import { Pagination } from "@/components/ui/Pagination";
import { getAdvertisement } from "@/lib/data/content";
import { paginate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Charter Operators — Search Results",
  description: "Air charter operators matching your search, with addresses, phone numbers, email and websites.",
};

const PAGE_SIZE = 10;
const AD_AFTER = 4;

export default async function CharterResultsPage({ searchParams }: PageProps<"/charter-operators/results">) {
  const filters = parseCharterParams(await searchParams);
  const [operators, bannerAd, sidebarAd, stripAd] = await Promise.all([
    loadCharterOperators({ q: filters.q, country: filters.country }),
    getAdvertisement("header-banner"),
    getAdvertisement("sidebar"),
    getAdvertisement("sponsored-strip"),
  ]);
  const result = paginate(
    operators.filter((p) => matchesCharterFilters(p, filters)),
    filters.page,
    PAGE_SIZE,
  );
  const query = charterQuery(filters);
  const modifyHref = `/charter-operators?${new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => Boolean(e[1]))).toString()}`;

  return (
    <>
      <AdBanner ad={bannerAd} className="pt-6" />
      <CharterHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Directory", href: "/directory" },
          { label: "Charter Operators", href: "/charter-operators" },
          { label: "Results" },
        ]}
        title="Charter Operators"
      />

      <div className="container-site grid gap-8 pt-6 pb-8 xl:grid-cols-[314px_minmax(0,660px)_314px] xl:justify-between">
        <div className="hidden xl:block">
          <SidebarAd ad={sidebarAd} className="sticky top-24 min-h-[560px]" />
        </div>

        <section aria-labelledby="charter-results-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
            <p id="charter-results-heading" className="text-sm text-muted" aria-live="polite">
              <strong className="font-bold text-ink">{result.total}</strong> {result.total === 1 ? "operator" : "operators"} found
              {filters.q && <> for &ldquo;{filters.q}&rdquo;</>}
            </p>
            <Link href={modifyHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <SlidersHorizontal className="size-4" aria-hidden />
              {hasCriteria(filters) ? "Modify search" : "Refine search"}
            </Link>
          </div>

          {result.items.length === 0 ? (
            <EmptyResults
              title="No charter operators found"
              message="No operators match your search. Try removing a filter, choosing a different location, or searching by company name only."
              resetHref="/charter-operators"
              resetLabel="New search"
            />
          ) : (
            <div className="overflow-hidden rounded-[16px] bg-white shadow-soft">
              {result.items.map((provider, i) => (
                <Fragment key={provider.id}>
                  <CharterResult provider={provider} />
                  {i === Math.min(AD_AFTER, result.items.length) - 1 && <SponsoredStrip ad={stripAd} className="m-4" />}
                </Fragment>
              ))}
            </div>
          )}

          <Pagination page={result.page} totalPages={result.totalPages} basePath="/charter-operators/results" params={query} className="pt-9" />
        </section>

        <div className="hidden xl:block">
          <div className="sticky top-24 flex flex-col gap-5">
            <SidebarAd ad={sidebarAd} className="min-h-[300px]" />
            <SponsoredCard ad={stripAd} />
          </div>
        </div>
      </div>

      <AdBanner ad={bannerAd} height="h-[150px] sm:h-[222px]" className="pt-6 pb-8" />
    </>
  );
}
