import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, NEWS_CATEGORY_TONE } from "@/components/ui/Badge";
import type { NewsArticle } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_2px_12px_rgba(11,31,58,0.07)] transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="relative h-[140px] bg-navy-900">
        <Image
          src={article.image}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 336px"
          className="object-cover opacity-90 transition duration-300 group-hover:opacity-100"
        />
      </div>
      <div className="px-3.5 py-3">
        <div className="flex items-center gap-2">
          <Badge tone={NEWS_CATEGORY_TONE[article.category] ?? "blue"}>{article.category}</Badge>
          <time dateTime={article.publishedAt} className="text-[10px] leading-[15px] text-subtle">
            {timeAgo(article.publishedAt)}
          </time>
        </div>
        <h3 className="truncate pt-2 text-sm leading-[17.5px] font-bold text-ink group-hover:text-brand">{article.title}</h3>
        <p className="truncate pt-1 text-xs leading-[19.5px] text-subtle">{article.excerpt}</p>
      </div>
    </Link>
  );
}

/** "Aviation Updates" — latest news in a 3-column grid. */
export function NewsGrid({ articles }: { articles: NewsArticle[] }) {
  return (
    <section aria-labelledby="news-heading" className="pt-6">
      <div className="flex items-center justify-between">
        <h2 id="news-heading" className="text-lg leading-7 font-bold text-ink">
          Aviation Updates
        </h2>
        <Link href="/news" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          View all <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      {articles.length === 0 ? (
        <p className="mt-4 rounded-[14px] border border-line bg-white p-8 text-center text-sm text-muted">No aviation updates have been published yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:gap-y-[63px]">
          {articles.map((a) => (
            <NewsCard key={a.slug} article={a} />
          ))}
        </div>
      )}
    </section>
  );
}
