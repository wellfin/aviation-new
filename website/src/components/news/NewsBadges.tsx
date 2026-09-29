import type { NewsArticle } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NEWS_BADGE_LABEL } from "./categories";

const pill = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] leading-[16.5px] font-bold tracking-[0.55px] uppercase";

export function NewsBadges({ article, className }: { article: Pick<NewsArticle, "category" | "featured">; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className={cn(pill, "border-brand-cyan/25 bg-brand-cyan/12 text-brand-cyan")}>{NEWS_BADGE_LABEL[article.category]}</span>
      {article.featured && (
        <span className={cn(pill, "border-[rgba(255,215,0,0.3)] bg-[linear-gradient(160deg,rgba(255,215,0,0.15)_0%,rgba(255,180,0,0.1)_100%)] text-[#d4a400]")}>Featured</span>
      )}
    </div>
  );
}
