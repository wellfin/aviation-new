import Image from "next/image";
import type { Advertisement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adLinkProps } from "./ad-link";

/** Dark sponsored listing strip (e.g. "World Fuel Services — Competitive Avgas & Jet-A Pricing"). */
export function SponsoredStrip({ ad, className, tall = false }: { ad: Advertisement | null; className?: string; tall?: boolean }) {
  if (!ad) return null;
  return (
    <div className={cn("relative overflow-hidden rounded-[14px] border-[1.5px] border-white/12 shadow-[0_2px_12px_rgba(0,0,0,0.15)]", tall ? "h-[224px]" : "h-[82px]", className)}>
      <Image src={ad.image} alt="" fill sizes="1350px" className="object-cover object-[72%_50%]" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950/92 via-navy-950/75 via-55% to-navy-950/35" />
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
      <span className="absolute top-2 right-2.5 rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[8px] font-bold tracking-[0.96px] text-white/40">AD</span>
      <div className="relative flex h-full items-center gap-4 px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-brand/30 bg-brand/14 text-xl" aria-hidden>
          ⛽
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-extrabold text-white">{ad.advertiser}</p>
            <span className="rounded-full border border-brand/25 bg-brand/14 px-1.5 py-0.5 text-[9px] font-bold text-brand">SPONSORED</span>
          </div>
          {ad.headline && <p className="pt-0.5 text-sm font-semibold text-brand">{ad.headline}</p>}
          {ad.body && <p className="truncate pt-0.5 text-[11px] text-white/50">{ad.body}</p>}
        </div>
        {ad.cta && (
          <a {...adLinkProps(ad)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand/80 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand">
            {ad.cta} <span aria-hidden>›</span>
          </a>
        )}
      </div>
    </div>
  );
}
