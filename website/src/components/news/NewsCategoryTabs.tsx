import Link from "next/link";
import type { NewsCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NEWS_CATEGORIES } from "./categories";

export function NewsCategoryTabs({ active, q }: { active: NewsCategory | "all"; q?: string }) {
  const tabs: Array<{ value: NewsCategory | "all"; label: string }> = [
    { value: "all", label: "All News" },
    ...NEWS_CATEGORIES.map((c) => ({ value: c, label: c })),
  ];
  const href = (value: NewsCategory | "all") => {
    const sp = new URLSearchParams();
    if (value !== "all") sp.set("category", value);
    if (q) sp.set("q", q);
    const qs = sp.toString();
    return qs ? `/news?${qs}` : "/news";
  };

  return (
    <nav aria-label="News categories" className="scrollbar-none -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-2">
        {tabs.map((t) => {
          const isActive = t.value === active;
          return (
            <li key={t.value}>
              <Link
                href={href(t.value)}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-[37px] items-center rounded-[10px] px-5 text-sm leading-[21px] font-semibold whitespace-nowrap transition",
                  isActive ? "bg-brand-gradient text-white" : "text-muted hover:bg-white hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
