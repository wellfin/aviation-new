import Image from "next/image";
import { ChevronDown } from "lucide-react";
import type { Advertisement } from "@/lib/types";
import { adLinkProps } from "./ad-link";

/**
 * The website's sticky footer ad (website/src/components/ads/StickyFooterAd.tsx) without the
 * fixed positioning, so the console can preview it inline. Keep the markup in sync.
 */
export function StickyFooterBar({ ad }: { ad: Advertisement }) {
  return (
    <div className="flex w-full flex-col items-center">
      <span className="flex h-7 w-14 items-center justify-center rounded-t-lg border border-b-0 border-white/15 bg-navy-950 text-white shadow-soft" aria-hidden>
        <ChevronDown className="size-5" />
      </span>
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
    </div>
  );
}
