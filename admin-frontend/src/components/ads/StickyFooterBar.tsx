import { ChevronDown } from "lucide-react";
import type { Advertisement } from "@/lib/types";
import { adLinkProps } from "./ad-link";

/**
 * The website's sticky footer ad (website/src/components/ads/StickyFooterAd.tsx) without the
 * fixed positioning, so the console can preview it inline. Keep the markup in sync.
 */
export function StickyFooterBar({ ad }: { ad: Advertisement }) {
  return (
    <div className="flex w-full justify-center bg-navy-950 pt-4">
      <div className="flex max-w-full flex-col items-center [&>a]:max-w-full">
        <span className="flex h-6 w-12 items-center justify-center rounded-t-lg bg-white text-ink/70 shadow-[0_-2px_8px_rgba(0,0,0,0.15)]" aria-hidden>
          <ChevronDown className="size-4" />
        </span>
        <a
          {...adLinkProps(ad)}
          className="block h-[120px] w-[min(1000px,calc(100vw-32px))] overflow-hidden rounded-t-md bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
          aria-label={`Advertisement: ${ad.advertiser}${ad.headline ? ` — ${ad.headline}` : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- any size the admin uploads, often from the API host */}
          <img src={ad.image} alt={ad.advertiser} className="block size-full object-contain" />
        </a>
      </div>
    </div>
  );
}
