import Image from "next/image";
import Link from "next/link";
import type { NewsArticle } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { NewsBadges } from "./NewsBadges";
import { NewsShareButton } from "./NewsShare";

/**
 * News card from the listing design (thumbnail + badges + title + excerpt + byline).
 * `stacked` puts the image above the text (used in multi-column grids).
 */
export function NewsListCard({ article, stacked = false }: { article: NewsArticle; stacked?: boolean }) {
  const href = `/news/${article.slug}`;
  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 rounded-[20px] bg-white p-4 shadow-[0_4px_24px_rgba(11,31,58,0.08),0_1px_4px_rgba(11,31,58,0.04)] transition hover:shadow-[0_8px_28px_rgba(11,31,58,0.12)] sm:p-5",
        !stacked && "sm:flex-row sm:gap-5",
      )}
    >
      <div className={cn("relative aspect-[10/7] w-full shrink-0 overflow-hidden rounded-xl bg-navy-900", !stacked && "sm:aspect-auto sm:h-28 sm:w-40")}>
        <Image src={article.image} alt="" fill sizes={stacked ? "(max-width: 1024px) 100vw, 440px" : "(max-width: 640px) 100vw, 160px"} className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <NewsBadges article={article} />
        <h3 className="pt-2 text-base leading-5 font-bold text-ink">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-[20px] hover:text-brand">
            {article.title}
          </Link>
        </h3>
        <p className={cn("line-clamp-2 pt-2 text-sm leading-[22.75px] text-muted", !stacked && "sm:line-clamp-1")}>{article.excerpt}</p>
        <div className="flex items-center gap-3 pt-3 text-xs leading-4 text-subtle">
          <span>✍️ {article.author}</span>
          <span aria-hidden>·</span>
          <time dateTime={article.publishedAt}>{timeAgo(article.publishedAt)}</time>
          <NewsShareButton title={article.title} path={href} className="relative z-10 ml-auto" />
        </div>
      </div>
    </article>
  );
}
