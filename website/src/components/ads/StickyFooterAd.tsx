"use client";

import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Advertisement } from "@/lib/types";
import { adLinkProps } from "./ad-link";

/** Collapsible leaderboard pinned to the bottom of the viewport. */
export function StickyFooterAd({ ad }: { ad: Advertisement | null }) {
  const [open, setOpen] = useState(true);
  if (!ad) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden justify-center md:flex">
      <div className="pointer-events-auto relative w-[1131px] max-w-[calc(100vw-32px)]">
        {open ? (
          <>
            <a {...adLinkProps(ad)} className="block">
              <Image src={ad.image} alt={ad.advertiser} width={2262} height={296} sizes="1131px" className="h-auto w-full" />
            </a>
            {/* The creative includes a collapse tab graphic; this transparent button sits on top of it. */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-expanded
              aria-label="Hide advertisement"
              className="absolute top-[2.5%] left-1/2 h-[18%] w-[5.5%] -translate-x-1/2 rounded-t-lg focus-visible:outline-2 focus-visible:outline-brand"
            >
              <ChevronDown className="sr-only" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-label="Show advertisement"
            className="mx-auto flex h-7 w-14 items-center justify-center rounded-t-lg border border-b-0 border-line bg-surface text-ink shadow-soft"
          >
            <ChevronUp className="size-5" />
          </button>
        )}
      </div>
    </div>
  );
}
