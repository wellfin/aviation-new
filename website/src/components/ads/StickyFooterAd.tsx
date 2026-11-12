"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Advertisement } from "@/lib/types";
import { adLinkProps } from "./ad-link";

/** The tab and banner. The banner is the uploaded image shown as-is (logo and text are part of the image). */
function Bar({ ad, open, onToggle }: { ad: Advertisement; open: boolean; onToggle?: () => void }) {
  return (
    <div className="flex max-w-[min(1131px,calc(100vw-32px))] flex-col items-center">
      <button
        type="button"
        onClick={onToggle}
        tabIndex={onToggle ? undefined : -1}
        aria-expanded={open}
        aria-label={open ? "Hide advertisement" : "Show advertisement"}
        className="flex h-6 w-12 items-center justify-center rounded-t-lg bg-white text-ink/70 shadow-[0_-2px_8px_rgba(0,0,0,0.15)] transition hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
      </button>
      {open && (
        <a
          {...adLinkProps(ad)}
          tabIndex={onToggle ? undefined : -1}
          className="block overflow-hidden rounded-t-md bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
          aria-label={`Advertisement: ${ad.advertiser}${ad.headline ? ` — ${ad.headline}` : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- any size the admin uploads, often from the API host */}
          <img src={ad.image} alt={ad.advertiser} className="block h-auto max-h-[120px] w-auto max-w-full" />
        </a>
      )}
    </div>
  );
}

/** Collapsible banner ad pinned to the bottom of the viewport (desktop). Managed in the admin panel under Ads → Sticky footer. */
export function StickyFooterAd({ ad }: { ad: Advertisement | null }) {
  const [open, setOpen] = useState(true);
  if (!ad) return null;
  return (
    <>
      {/* In-flow copy below the footer, invisible, so the page ends exactly where the pinned banner's top is and it never covers the last lines. */}
      <div aria-hidden inert className="hidden justify-center bg-navy-950 md:flex">
        <div className="invisible">
          <Bar ad={ad} open={open} />
        </div>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden justify-center md:flex">
        <div className="pointer-events-auto">
          <Bar ad={ad} open={open} onToggle={() => setOpen((v) => !v)} />
        </div>
      </div>
    </>
  );
}
