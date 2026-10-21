import type { Metadata } from "next";
import { Fragment } from "react";
import { AdBanner } from "@/components/ads/AdBanner";
import { SponsoredStrip } from "@/components/ads/SponsoredStrip";
import { DirectoryHero } from "@/components/directory/DirectoryHero";
import { DirectoryToolbar } from "@/components/directory/DirectoryToolbar";
import { EmptyResults } from "@/components/directory/EmptyResults";
import { directoryHref, parseDirectoryParams, toQuery } from "@/components/directory/params";
import { ProviderRow } from "@/components/airport/ProviderRow";
import { ServiceSidebar } from "@/components/airport/ServiceSidebar";
import { SkyscraperAd } from "@/components/airport/SkyscraperAd";
import { isDesignCategory } from "@/components/categories/design-categories";
import { listCategories } from "@/lib/data/categories";
import { TierSelect } from "@/components/directory/TierSelect";
import { ProviderCard } from "@/components/providers/ProviderCard";
import { Pagination } from "@/components/ui/Pagination";
import { getAdvertisement } from "@/lib/data/content";
import { listProviders } from "@/lib/data/providers";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Aviation Services Directory",
  description:
    "Browse verified FBOs, ground handlers, trip support, fuel suppliers, caterers, charter operators and more across 180 countries. Filter by service, tier and rating.",
};

const PAGE_SIZE = 9;
/** The sponsored strip sits after the first row of grid results. */
const STRIP_AFTER = 3;

export default async function DirectoryPage({ searchParams }: PageProps<"/directory">) {
  const [sp, categories] = await Promise.all([searchParams, listCategories()]);
  const params = parseDirectoryParams(sp, categories);
  const [result, bannerAd, stripAd] = await Promise.all([
    listProviders({
      q: params.q,
      category: params.category,
      tier: params.tier,
      sort: params.sort,
      page: params.page,
      pageSize: PAGE_SIZE,
    }),
    getAdvertisement("header-banner"),
    getAdvertisement("sponsored-strip"),
  ]);
  const isGrid = params.view === "grid";
  const category = params.category === "all" ? undefined : categories.find((c) => c.slug === params.category);

  const summary = (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-6 first:pt-0">
      <p className="text-sm text-muted" aria-live="polite">
        Showing <strong className="font-bold text-ink">{formatNumber(result.total)}</strong> {result.total === 1 ? "provider" : "providers"}
        {category && <> in {category.name}</>}
        {params.q && <> for &ldquo;{params.q}&rdquo;</>}
      </p>
      <TierSelect params={params} className="w-[140px]" />
    </div>
  );
  const empty = (
    <EmptyResults
      message={
        params.q
          ? `We couldn't find any providers matching "${params.q}" with the selected filters. Try a different search term or category.`
          : "No providers match the selected filters yet. Try another category or tier."
      }
      resetHref={isGrid ? "/directory" : "/directory?view=list"}
    />
  );
  const pagination = <Pagination page={result.page} totalPages={result.totalPages} basePath="/directory" params={toQuery(params)} className="pt-10" />;

  return (
    <>
      <AdBanner ad={bannerAd} className="pt-4" />
      <DirectoryHero params={params} />

      <div className="container-site pt-8 pb-10">
        <DirectoryToolbar params={params} categories={categories} />

        {isGrid ? (
          <>
            {summary}
            <div className="pt-4">
              {result.items.length === 0 ? (
                empty
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {result.items.map((provider, i) => (
                    <Fragment key={provider.id}>
                      <ProviderCard provider={provider} />
                      {i === STRIP_AFTER - 1 && result.items.length > STRIP_AFTER && <SponsoredStrip ad={stripAd} className="col-span-full h-[164px]" />}
                    </Fragment>
                  ))}
                </div>
              )}
            </div>
            {pagination}
          </>
        ) : (
          // List view (Figma airport listing, 752:9750): service rail · listings · side ads.
          <div className="grid gap-6 pt-6 md:grid-cols-[248px_minmax(0,1fr)] md:gap-5 lg:grid-cols-[248px_minmax(0,1fr)_272px]">
            <div className="min-w-0">
              <ServiceSidebar
                label="Service categories"
                categories={categories.filter(isDesignCategory)}
                active={params.category === "all" ? undefined : params.category}
                hrefFor={(slug) => directoryHref(params, { category: slug })}
                allHref={directoryHref(params, { category: "all" })}
              />
            </div>
            <div className="min-w-0">
              {summary}
              <div className="pt-4">
                {result.items.length === 0 ? (
                  empty
                ) : (
                  <section aria-label="Providers" className="space-y-[5px] overflow-hidden rounded-[20px] bg-white">
                    {result.items.map((provider) => (
                      <ProviderRow key={provider.id} provider={provider} />
                    ))}
                  </section>
                )}
              </div>
              {pagination}
            </div>
            <aside className="hidden flex-col gap-6 lg:flex" aria-label="Advertisement">
              <SkyscraperAd className="min-h-[600px]" />
              <SkyscraperAd className="min-h-[600px]" />
            </aside>
          </div>
        )}
      </div>

      <AdBanner ad={bannerAd} height="h-[150px] sm:h-[186px]" className="pb-8" />
    </>
  );
}
