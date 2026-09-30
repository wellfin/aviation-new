"use client";

import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Advertisement } from "@/lib/types";
import { adLinkProps } from "./ad-link";

/**
 * Collapsible leaderboard pinned to the bottom of the viewport. The image is a
 * text-free background; advertiser, headline and CTA come from the admin panel.
 */
export function StickyFooterAd({ ad }: { ad: Advertisement | null }) {
  const [open, setOpen] = useState(true);
  if (!ad) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden justify-center md:flex">
      <div className="pointer-events-auto flex w-[1131px] max-w-[calc(100vw-32px)] flex-col items-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Hide advertisement" : "Show advertisement"}
          className="flex h-7 w-14 items-center justify-center rounded-t-lg border border-b-0 border-white/15 bg-navy-950 text-white shadow-soft focus-visible:outline-2 focus-visible:outline-brand"
        >
          {open ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}
        </button>
        {open && (
          <a
            {...adLinkProps(ad)}
            className="group relative block h-[120px] w-full overflow-hidden rounded-t-[20px] border border-b-0 border-white/10 bg-navy-950 shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
            aria-label={`Advertisement: ${ad.advertiser}${ad.headline ? ` — ${ad.headline}` : ""}`}
          >
            <Image src={ad.image} alt="" fill sizes="1131px" className="object-cover object-[72%_50%]" />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/60 via-45% to-transparent" />
            <span className="absolute top-2.5 right-3 rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[8px] font-bold tracking-[0.96px] text-white/60">AD</span>
            <div className="relative flex h-full items-center gap-6 px-8">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-extrabold text-white lg:text-2xl">{ad.advertiser}</p>
                {ad.headline && <p className="truncate pt-1 text-sm font-semibold text-brand-cyan lg:text-base">{ad.headline}</p>}
                {ad.body && <p className="hidden truncate pt-1 text-xs text-white/60 lg:block">{ad.body}</p>}
              </div>
              {ad.cta && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white transition group-hover:brightness-110">
                  {ad.cta} <span aria-hidden>›</span>
                </span>
              )}
            </div>
          </a>
        )}
      </div>
    </div>
  );
}
