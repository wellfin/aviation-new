import Image from "next/image";
import type { Advertisement } from "@/lib/types";
import { adLinkProps } from "@/components/ads/ad-link";
import { cn } from "@/lib/utils";

/** Tall sponsored card used in the news sidebar (image background, bottom-aligned copy, blue CTA). */
export function NewsSponsorCard({ ad, icon, className }: { ad: Advertisement | null; icon: string; className?: string }) {
  if (!ad) return null;
  return (
    <aside
      aria-label={`Sponsored: ${ad.advertiser}`}
      className={cn("relative h-[250px] overflow-hidden rounded-[14px] border border-white/12 bg-navy-950 shadow-[0_2px_12px_rgba(0,0,0,0.15)]", className)}
    >
      <Image src={ad.image} alt="" fill sizes="(max-width: 1024px) 100vw, 434px" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/50 via-navy-950/88 via-55% to-navy-950/97" />
      <div className="absolute top-0 left-0 h-0.5 w-[70%] bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
      <span className="absolute top-2 right-2.5 rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[8px] leading-3 font-bold tracking-[0.96px] text-white/40">
        AD
      </span>
      <span className="absolute top-4 left-4 flex size-10 items-center justify-center rounded-xl border border-brand/30 bg-brand/14 text-xl" aria-hidden>
        {icon}
      </span>
      <div className="relative flex h-full flex-col justify-end p-4">
        <p className="text-[10px] leading-[15px] font-bold tracking-[1px] text-brand">SPONSORED</p>
        <p className="pt-2 text-base leading-5 font-extrabold text-white">{ad.advertiser}</p>
        {ad.headline && <p className="pt-1 text-xs leading-[15px] font-semibold text-brand">{ad.headline}</p>}
        {ad.body && <p className="max-w-[267px] pt-2 text-[11px] leading-[16.5px] text-white/50">{ad.body}</p>}
        {ad.cta && (
          <a
            {...adLinkProps(ad)}
            className="mx-auto mt-4 flex h-8 w-full max-w-[266px] items-center justify-center rounded-xl bg-brand/80 text-xs font-bold text-white transition hover:bg-brand"
          >
            {ad.cta.replace(/\s*→$/, "")} →
          </a>
        )}
      </div>
    </aside>
  );
}
