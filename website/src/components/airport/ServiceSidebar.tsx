import Link from "next/link";
import { ChevronDown, LayoutGrid, type LucideIcon } from "lucide-react";
import { categoryIcon } from "@/components/categories/category-icon";
import type { ServiceCategory, ServiceCategorySlug } from "@/lib/types";
import { cn } from "@/lib/utils";
import { airportHref } from "./routes";

interface Item {
  slug: ServiceCategorySlug | "all";
  label: string;
  icon: LucideIcon;
}

/** Categories shown before the "View All" disclosure (the rest follow the admin-defined order). */
const PRIMARY_COUNT = 9;

/** Left rail of service categories; selecting one lists the providers at this airport (?service=). */
export function ServiceSidebar({
  icao,
  active,
  counts,
  categories,
}: {
  icao: string;
  active?: string;
  counts: Record<string, number>;
  categories: ServiceCategory[];
}) {
  const items: Item[] = categories.map((c) => ({ slug: c.slug, label: c.name, icon: categoryIcon(c.icon) }));
  const PRIMARY = items.slice(0, PRIMARY_COUNT);
  const MORE: Item[] = [...items.slice(PRIMARY_COUNT), { slug: "all", label: "All Services", icon: LayoutGrid }];
  const moreOpen = MORE.some((m) => m.slug === active);

  const renderItem = (item: Item) => {
    const selected = item.slug === active;
    const count = item.slug === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[item.slug] ?? 0);
    return (
      <li key={item.slug}>
        <Link
          href={airportHref(icao, { service: item.slug, hash: "airport-content" })}
          aria-current={selected ? "page" : undefined}
          className={cn(
            "flex h-[46px] items-center gap-3 rounded-xl border px-3 text-[13px] font-bold text-white transition",
            selected ? "bg-brand-gradient border-transparent shadow-soft" : "border-white/10 bg-navy-900 hover:bg-navy-800",
          )}
        >
          <item.icon className="size-[18px] shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {count > 0 && <span className="rounded-full bg-white/15 px-1.5 text-[10px] leading-4 font-bold">{count}</span>}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Services at this airport" className="rounded-[20px] bg-white p-4 shadow-card md:p-6">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-1">{PRIMARY.map(renderItem)}</ul>
      <details className="group mt-2" open={moreOpen}>
        <summary className="flex h-[46px] cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-white/10 bg-navy-900 text-[13px] font-bold text-white transition hover:bg-navy-800 [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">View All</span>
          <span className="hidden group-open:inline">Show Less</span>
          <ChevronDown className="size-4 fill-white transition group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-1">{MORE.map(renderItem)}</ul>
      </details>
    </nav>
  );
}
