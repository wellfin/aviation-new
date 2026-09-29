import type { Metadata } from "next";
import { Fragment } from "react";
import { AdBanner } from "@/components/ads/AdBanner";
import { SponsoredStrip } from "@/components/ads/SponsoredStrip";
import { DirectoryHero } from "@/components/directory/DirectoryHero";
import { DirectoryToolbar } from "@/components/directory/DirectoryToolbar";
import { EmptyResults } from "@/components/directory/EmptyResults";
import { parseDirectoryParams, toQuery } from "@/components/directory/params";
import { listCategories } from "@/lib/data/categories";
import { TierSelect } from "@/components/directory/TierSelect";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { ProviderListRow } from "@/components/providers/ProviderListRow";
import { Pagination } from "@/components/ui/Pagination";
import { getAdvertisement } from "@/lib/data/content";
import { listProviders } from "@/lib/data/providers";
import { cn, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Aviation Services Directory",
  description:
    "Browse verified FBOs, ground handlers, trip support, fuel suppliers, caterers, charter operators and more across 180 countries. Filter by service, tier and rating.",
};

const PAGE_SIZE = 9;

export default async function DirectoryPage({ searchParams }: PageProps<"/directory">) {
  const [sp, categories] = await Promise.all([searchParams, listCategories()]);
  const params = parseDirectoryParams(sp, categories);
  const [result, bannerAd, stripAd] = await Promise.all([
    listProviders({ q: params.q, category: params.category, tier: params.tier, sort: params.sort, page: params.page, pageSize: PAGE_SIZE }),
    getAdvertisement("header-banner"),
    getAdvertisement("sponsored-strip"),
  ]);
  const isGrid = params.view === "grid";
  // The sponsored strip sits after the first row of results.
  const stripAfter = isGrid ? 3 : 2;
  const category = params.category === "all" ? undefined : categories.find((c) => c.slug === params.category);

  return (
    <>
      <AdBanner ad={bannerAd} className="pt-4" />
      <DirectoryHero params={params} />

      <div className="container-site pt-8 pb-10">
        <DirectoryToolbar params={params} categories={categories} />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <p className="text-sm text-muted" aria-live="polite">
            Showing <strong className="font-bold text-ink">{formatNumber(result.total)}</strong> {result.total === 1 ? "provider" : "providers"}
            {category && <> in {category.name}</>}
            {params.q && <> for &ldquo;{params.q}&rdquo;</>}
          </p>
          <TierSelect params={params} className="w-[140px]" />
        </div>

        <div className="pt-4">
          {result.items.length === 0 ? (
            <EmptyResults
              message={
                params.q
                  ? `We couldn't find any providers matching "${params.q}" with the selected filters. Try a different search term or category.`
                  : "No providers match the selected filters yet. Try another category or tier."
              }
              resetHref="/directory"
            />
          ) : (
            <div className={cn("grid", isGrid ? "gap-5 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 gap-3")}>
              {result.items.map((provider, i) => (
                <Fragment key={provider.id}>
                  {isGrid ? <ProviderCard provider={provider} /> : <ProviderListRow provider={provider} />}
                  {i === stripAfter - 1 && result.items.length > stripAfter && (
                    <SponsoredStrip ad={stripAd} className="col-span-full" />
                  )}
                </Fragment>
              ))}
            </div>
          )}
        </div>

        <Pagination page={result.page} totalPages={result.totalPages} basePath="/directory" params={toQuery(params)} className="pt-10" />
      </div>

      <AdBanner ad={bannerAd} height="h-[150px] sm:h-[186px]" className="pb-8" />
    </>
  );
}
