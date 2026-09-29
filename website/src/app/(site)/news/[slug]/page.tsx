import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdBanner } from "@/components/ads/AdBanner";
import { NewsBadges } from "@/components/news/NewsBadges";
import { NewsListCard } from "@/components/news/NewsListCard";
import { ArticleShareLinks } from "@/components/news/NewsShare";
import { NewsSidebar } from "@/components/news/NewsSidebar";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { orFallback } from "@/lib/data/safe";
import { getAdvertisement, getNewsArticle, listNews } from "@/lib/data/content";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsArticle(slug);
  if (!article) return { title: "Article not found" };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: { type: "article", title: article.title, description: article.excerpt, images: [article.image], publishedTime: article.publishedAt, authors: [article.author] },
  };
}

export default async function NewsArticlePage({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const article = await getNewsArticle(slug);
  if (!article) notFound();

  const [sameCategory, latest, banner] = await Promise.all([
    orFallback(listNews({ category: article.category, pageSize: 4 }), { items: [], total: 0, page: 1, pageSize: 4, totalPages: 1 }),
    orFallback(listNews({ pageSize: 4 }), { items: [], total: 0, page: 1, pageSize: 4, totalPages: 1 }),
    getAdvertisement("header-banner"),
  ]);
  // Prefer same-category stories, topped up with the latest news.
  const related = [...sameCategory.items, ...latest.items]
    .filter((n, i, all) => n.slug !== article.slug && all.findIndex((m) => m.slug === n.slug) === i)
    .slice(0, 3);
  const path = `/news/${article.slug}`;

  return (
    <div className="bg-[#f7fafc]">
      <section className="bg-header-gradient px-4 pt-8 pb-12 md:px-6">
        <div className="mx-auto max-w-[900px]">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "News", href: "/news" },
              { label: article.category, href: `/news?category=${encodeURIComponent(article.category)}` },
              { label: article.title },
            ]}
            className="[&>span:last-child]:line-clamp-1"
          />
          <NewsBadges article={article} className="pt-6" />
          <h1 className="pt-4 text-[30px] leading-[1.15] font-extrabold tracking-[-0.72px] text-white md:text-[42px]">{article.title}</h1>
          <p className="pt-4 text-base leading-7 text-white/60 md:text-lg">{article.excerpt}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-6 text-sm text-white/60">
            <span className="flex items-center gap-2">
              <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-full text-xs font-bold text-white" aria-hidden>
                {article.author
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span>
                <span className="font-semibold text-white">{article.author}</span>
                <span className="block text-xs text-white/50">{article.authorRole}</span>
              </span>
            </span>
            <span aria-hidden>·</span>
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
            <span aria-hidden>·</span>
            <span>{article.readMinutes} min read</span>
          </div>
        </div>
      </section>

      <div className="container-site grid gap-6 py-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <article className="overflow-hidden rounded-[20px] bg-white shadow-[0_4px_24px_rgba(11,31,58,0.08),0_1px_4px_rgba(11,31,58,0.04)]">
          <div className="relative aspect-[16/9] bg-navy-900">
            <Image src={article.image} alt={article.title} fill priority sizes="(max-width: 1024px) 100vw, 900px" className="object-cover" />
          </div>
          <div className="p-5 md:p-10">
            <div className="flex flex-col gap-5 text-base leading-7 text-ink/80 md:text-[17px] md:leading-8">
              {article.body.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <ArticleShareLinks title={article.title} path={path} />
              <Link href="/news" className="text-sm font-semibold text-brand hover:underline">
                ← Back to all news
              </Link>
            </div>
          </div>
        </article>

        <NewsSidebar />
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="container-site pb-10">
          <h2 id="related-title" className="pb-5 text-2xl font-extrabold text-ink">
            Related articles
          </h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {related.map((n) => (
              <NewsListCard key={n.slug} article={n} stacked />
            ))}
          </div>
        </section>
      )}

      <AdBanner ad={banner} height="h-[72px] sm:h-[120px] md:h-[222px]" className="pb-9" />
    </div>
  );
}
