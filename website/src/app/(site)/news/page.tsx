import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { AdBanner } from "@/components/ads/AdBanner";
import { parseNewsCategory } from "@/components/news/categories";
import { NewsCategoryTabs } from "@/components/news/NewsCategoryTabs";
import { NewsListCard } from "@/components/news/NewsListCard";
import { NewsSidebar } from "@/components/news/NewsSidebar";
import { Pagination } from "@/components/ui/Pagination";
import { getAdvertisement, listNews } from "@/lib/data/content";
import { firstParam, toInt } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Aviation Industry News — Latest News, Insights & Analysis",
  description: "Latest news, insights and analysis from the global aviation industry: FBO network updates, regulation, fuel markets, technology and business aviation.",
};

const PAGE_SIZE = 5;

export default async function NewsPage({ searchParams }: PageProps<"/news">) {
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? "").trim();
  const category = parseNewsCategory(firstParam(sp.category));
  const page = Math.max(1, toInt(sp.page, 1));

  const [news, banner] = await Promise.all([listNews({ q, category, page, pageSize: PAGE_SIZE }), getAdvertisement("header-banner")]);

  return (
    <div className="bg-[#f7fafc]">
      <AdBanner ad={banner} height="h-[60px] sm:h-[90px] md:h-[150px]" className="bg-white py-2.5" />

      <section className="bg-header-gradient px-4 py-12 text-center md:px-6">
        <h1 className="text-[34px] leading-10 font-extrabold tracking-[-0.72px] text-white md:text-[46px]">Aviation Industry</h1>
        <p className="mx-auto max-w-[760px] pt-3 text-lg leading-6 text-white/60 md:text-2xl">Latest news, insights and analysis from the global aviation industry.</p>
        <form action="/news" role="search" className="mx-auto mt-6 max-w-[819px]">
          {category !== "all" && <input type="hidden" name="category" value={category} />}
          <label htmlFor="news-search" className="sr-only">
            Search news
          </label>
          <div className="relative">
            <input
              id="news-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search news..."
              className="h-[52px] w-full rounded-xl border border-white/15 bg-white/8 pr-14 pl-4 text-[15px] text-white outline-none placeholder:text-subtle focus:border-brand-cyan"
            />
            <button type="submit" aria-label="Search" className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white">
              <Search className="size-[18px]" />
            </button>
          </div>
        </form>
      </section>

      <div className="container-site py-8">
        <NewsCategoryTabs active={category} q={q || undefined} />

        <div className="grid gap-6 pt-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            {q && (
              <p className="text-sm text-muted">
                {news.total} {news.total === 1 ? "result" : "results"} for <span className="font-semibold text-ink">“{q}”</span>
                {" · "}
                <Link href={category === "all" ? "/news" : `/news?category=${encodeURIComponent(category)}`} className="font-semibold text-brand hover:underline">
                  Clear search
                </Link>
              </p>
            )}
            {news.items.length > 0 ? (
              news.items.map((article) => <NewsListCard key={article.slug} article={article} />)
            ) : (
              <div className="rounded-[20px] bg-white p-10 text-center shadow-soft">
                <p className="text-lg font-bold text-ink">No articles found</p>
                <p className="pt-2 text-sm text-muted">Try a different search term or category.</p>
                <Link href="/news" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
                  View all news
                </Link>
              </div>
            )}
            <Pagination
              page={news.page}
              totalPages={news.totalPages}
              basePath="/news"
              params={{ q: q || undefined, category: category === "all" ? undefined : category }}
              className="pt-2"
            />
          </div>

          <NewsSidebar />
        </div>
      </div>

      <AdBanner ad={banner} height="h-[72px] sm:h-[120px] md:h-[222px]" className="pb-9" />
    </div>
  );
}
