import Image from "next/image";
import Link from "next/link";
import { LayoutGrid, type LucideIcon } from "lucide-react";
import { categoryIcon } from "@/components/categories/category-icon";
import type { ServiceCategory, ServiceCategorySlug } from "@/lib/types";
import { cn } from "@/lib/utils";
import { airportHref } from "./routes";

interface Item {
  slug: ServiceCategorySlug | "all";
  label: string;
  /** Design icon (public/images/airport) when the category has one, else the category's own icon. */
  image?: string;
  icon: LucideIcon;
}

/** The airport page's rail order (Figma 752:249); categories not listed follow in the admin-defined order. */
const RAIL_ORDER = ["fbo", "ground-handler", "supervisory-agent", "permit", "fuel", "catering", "trip-support", "charter-operator", "charter-broker"];

/** Categories shown before the "View All" disclosure. */
const PRIMARY_COUNT = RAIL_ORDER.length;

/** Icons drawn for this rail in the design. (The design reuses the ground-handler glyph for Permit.) */
const RAIL_ICON: Record<string, string> = {
  fbo: "svc-fbo",
  "ground-handler": "svc-ground-handler",
  "supervisory-agent": "svc-supervisory",
  permit: "svc-ground-handler",
  fuel: "svc-fuel",
  catering: "svc-catering",
  "trip-support": "svc-trip-support",
  "charter-operator": "svc-charter",
  "charter-broker": "svc-broker",
  hotels: "svc-hotel",
  mro: "svc-mro",
  "other-services": "svc-other",
};

function railPosition(slug: string): number {
  const i = RAIL_ORDER.indexOf(slug);
  return i === -1 ? RAIL_ORDER.length : i;
}

/** Left rail of service categories; selecting one lists the providers at this airport (?service=). */
export function ServiceSidebar({ icao, active, categories }: { icao: string; active?: string; categories: ServiceCategory[] }) {
  // Stable sort: rail categories first in design order, the rest keep the admin order.
  const ordered = categories.map((c, i) => ({ c, i })).sort((a, b) => railPosition(a.c.slug) - railPosition(b.c.slug) || a.i - b.i);
  const items: Item[] = ordered.map(({ c }) => ({
    slug: c.slug,
    label: c.name,
    image: RAIL_ICON[c.slug] ? `/images/airport/${RAIL_ICON[c.slug]}.svg` : undefined,
    icon: categoryIcon(c.icon),
  }));
  const PRIMARY = items.slice(0, PRIMARY_COUNT);
  const MORE: Item[] = [...items.slice(PRIMARY_COUNT), { slug: "all", label: "All Services", icon: LayoutGrid }];
  const moreOpen = MORE.some((m) => m.slug === active);

  const renderItem = (item: Item) => {
    const selected = item.slug === active;
    return (
      <li key={item.slug}>
        <Link
          href={airportHref(icao, { service: item.slug, hash: "airport-content" })}
          aria-current={selected ? "page" : undefined}
          className={cn(
            "flex h-[46px] items-center gap-3 rounded-xl border-[0.755px] p-3 text-[13px] leading-[15px] font-bold text-white transition",
            selected ? "bg-brand-gradient border-transparent shadow-soft" : "border-white/10 bg-navy-900 hover:bg-navy-800",
          )}
        >
          {item.image ? <Image src={item.image} alt="" width={18} height={18} className="size-[18px] shrink-0" /> : <item.icon className="size-[18px] shrink-0" aria-hidden />}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Services at this airport" className="rounded-[20px] bg-white p-4 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] md:min-h-[636px] md:p-6">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-1">{PRIMARY.map(renderItem)}</ul>
      <details className="group mt-2" open={moreOpen}>
        <summary className="flex h-[46px] cursor-pointer list-none items-center justify-center gap-3 rounded-xl border-[0.755px] border-white/10 bg-navy-900 text-[13px] leading-[15px] font-bold text-white transition hover:bg-navy-800 [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">View All</span>
          <span className="hidden group-open:inline">Show Less</span>
          <Image src="/images/airport/view-all-arrow.svg" alt="" width={17} height={17} className="size-[17px] transition group-open:rotate-180" />
        </summary>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-1">{MORE.map(renderItem)}</ul>
      </details>
    </nav>
  );
}
