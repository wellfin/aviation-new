import Image from "next/image";
import type { Advertisement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adLinkProps } from "./ad-link";

/**
 * Full-width banner. The image is a text-free background; the advertiser name,
 * headline, body and call-to-action come from the ad's admin-panel fields and
 * are drawn on top. The whole banner is the click target.
 */
export function AdBanner({ ad, className, height = "h-[150px]" }: { ad: Advertisement | null; className?: string; height?: string }) {
  if (!ad) return null;
  return (
    <div className={cn("container-site", className)}>
      <a
        {...adLinkProps(ad)}
        // Below `sm` a fixed ratio keeps the banner proportional on narrow screens.
        className={cn("group relative block overflow-hidden rounded-[19px] bg-navy-950 max-sm:aspect-[2172/411] max-sm:h-auto max-sm:rounded-xl", height)}
        aria-label={`Advertisement: ${ad.advertiser}${ad.headline ? ` — ${ad.headline}` : ""}`}
      >
        <Image src={ad.image} alt="" fill sizes="(max-width: 1400px) 100vw, 1350px" className="object-cover object-[72%_50%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/60 via-45% to-transparent" />
        <span className="absolute top-2 right-2.5 rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[8px] font-bold tracking-[0.96px] text-white/60 sm:top-3 sm:right-4">
          AD
        </span>
        <div className="relative flex h-full items-center gap-6 px-4 sm:px-8 md:px-12">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-white sm:text-xl md:text-2xl lg:text-[28px]">{ad.advertiser}</p>
            {ad.headline && <p className="truncate pt-0.5 text-[11px] font-semibold text-brand-cyan sm:text-sm md:pt-1 md:text-lg">{ad.headline}</p>}
            {ad.body && <p className="hidden max-w-[640px] pt-2 text-sm leading-5 text-white/70 lg:line-clamp-2">{ad.body}</p>}
          </div>
          {ad.cta && (
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition group-hover:brightness-110 sm:flex md:px-6 md:py-3">
              {ad.cta} <span aria-hidden>›</span>
            </span>
          )}
        </div>
      </a>
    </div>
  );
}
