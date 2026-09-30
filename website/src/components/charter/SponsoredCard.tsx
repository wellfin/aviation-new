import Image from "next/image";
import type { Advertisement } from "@/lib/types";
import { adLinkProps } from "@/components/ads/ad-link";
import { cn } from "@/lib/utils";

/**
 * Vertical version of the sponsored strip creative (World Fuel Services) used in the
 * charter sidebar. The shared SponsoredStrip is horizontal-only, so this lives locally.
 */
export function SponsoredCard({ ad, className }: { ad: Advertisement | null; className?: string }) {
  if (!ad) return null;
  return (
    <aside
      aria-label="Sponsored"
      className={cn("relative flex min-h-[250px] flex-col justify-end overflow-hidden rounded-[14px] border-[1.5px] border-white/12 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.15)]", className)}
    >
      <Image src={ad.image} alt="" fill sizes="430px" className="object-cover object-[72%_50%]" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/75 to-navy-950/40" />
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
      <span className="absolute top-2.5 right-4 rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[8px] font-bold tracking-[0.96px] text-white/40">AD</span>
      <span className="absolute top-4 left-4 flex size-10 items-center justify-center rounded-xl border-[1.5px] border-brand/30 bg-brand/14 text-xl" aria-hidden>
        ⛽
      </span>
      <div className="relative">
        <p className="text-[10px] font-bold tracking-[1.2px] text-brand">SPONSORED</p>
        <p className="pt-2 text-base font-extrabold text-white">{ad.advertiser}</p>
        {ad.headline && <p className="pt-1 text-xs font-semibold text-brand">{ad.headline}</p>}
        {ad.body && <p className="max-w-[270px] pt-2 text-[11px] leading-4 text-white/50">{ad.body}</p>}
        {ad.cta && (
          <a
            {...adLinkProps(ad)}
            className="mt-4 flex h-8 w-full items-center justify-center rounded-lg bg-brand/80 text-xs font-bold text-white transition hover:bg-brand"
          >
            {ad.cta} →
          </a>
        )}
      </div>
    </aside>
  );
}
