"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryIcon } from "@/components/categories/category-icon";
import type { ServiceCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 8400 → "8.4K", 980 → "980". */
function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n);
}

const providers = (n: number) => `${compact(n)} provider${n === 1 ? "" : "s"}`;

export function serviceHref(slug: string): string {
  return slug === "charter-operator" ? "/charter-operators" : `/directory?category=${encodeURIComponent(slug)}`;
}

/**
 * Header "Services" mega-menu (Figma 46:3402): category grid on the left with
 * provider counts; the hovered/focused category is previewed on the right.
 */
export function ServicesMenu({ categories, onNavigate }: { categories: ServiceCategory[]; onNavigate: () => void }) {
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug);
  const active = categories.find((c) => c.slug === activeSlug) ?? categories[0];
  const total = categories.reduce((sum, c) => sum + (c.providerCount ?? 0), 0);

  return (
    <div
      role="menu"
      aria-label="Aviation services"
      className="fixed top-[78px] left-1/2 z-50 w-[820px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-[20px] border-[0.57px] border-brand-cyan/15 bg-navy-950/98 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur"
    >
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <p className="px-1 font-mono text-[10px] leading-[15px] tracking-[1px] text-brand-cyan">
            AVIATION SERVICES · {total.toLocaleString("en-US")} PROVIDERS
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1">
            {categories.map((c) => {
              const isActive = c.slug === active?.slug;
              return (
                <Link
                  key={c.slug}
                  role="menuitem"
                  href={serviceHref(c.slug)}
                  onClick={onNavigate}
                  onMouseEnter={() => setActiveSlug(c.slug)}
                  onFocus={() => setActiveSlug(c.slug)}
                  className={cn(
                    "flex h-[51px] items-center gap-2.5 rounded-xl border-[0.57px] p-2.5 transition",
                    isActive ? "border-brand-cyan/25 bg-brand-cyan/10" : "border-transparent bg-white/3 hover:bg-white/6",
                  )}
                >
                  <CategoryIcon name={c.icon} className={cn("size-[18px] shrink-0", isActive ? "text-brand-cyan" : "text-white/70")} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs leading-[15px] font-semibold text-white">{c.name}</span>
                    <span className={cn("block font-mono text-[10px] leading-[15px]", isActive ? "text-brand-cyan" : "text-white/35")}>
                      {providers(c.providerCount ?? 0)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {active && (
          <div className="flex w-[220px] shrink-0 flex-col gap-3 rounded-2xl border-[0.57px] border-brand-cyan/12 bg-brand-cyan/4 p-4">
            <CategoryIcon name={active.icon} className="size-8 text-brand-cyan" />
            <div>
              <p className="text-sm leading-5 font-bold text-white">{active.name}</p>
              {active.description && <p className="pt-1 text-[11px] leading-[16.5px] text-white/50">{active.description}</p>}
            </div>
            <div className="rounded-xl border-[0.57px] border-brand-cyan/15 bg-brand-cyan/8 px-3 py-2 text-center">
              <p className="text-lg leading-7 font-extrabold text-brand-cyan">{compact(active.providerCount ?? 0)}</p>
              <p className="text-[10px] leading-[15px] text-white/40">Total Providers</p>
            </div>
            <Link
              role="menuitem"
              href={serviceHref(active.slug)}
              onClick={onNavigate}
              className="bg-brand-gradient rounded-xl py-2 text-center text-xs leading-4 font-bold text-white transition hover:brightness-110"
            >
              View {active.name} Providers →
            </Link>
          </div>
        )}
      </div>

      <div className="mt-4 border-t-[0.57px] border-white/8 pt-3">
        <Link
          role="menuitem"
          href="/directory"
          onClick={onNavigate}
          className="bg-brand-gradient inline-flex h-9 items-center rounded-xl px-4 text-xs leading-4 font-semibold text-white transition hover:brightness-110"
        >
          Browse All {total > 0 ? `${compact(total)}+ ` : ""}Providers →
        </Link>
      </div>
    </div>
  );
}
