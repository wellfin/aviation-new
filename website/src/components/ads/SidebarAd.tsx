import Image from "next/image";
import type { Advertisement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adLinkProps } from "./ad-link";

/** Dark sidebar sponsor card (e.g. "Universal Weather — End-to-End Trip Support"). */
export function SidebarAd({ ad, className }: { ad: Advertisement | null; className?: string }) {
  if (!ad) return null;
  return (
    <aside className={cn("relative overflow-hidden rounded-[16px] bg-navy-950 p-4 text-white shadow-card", className)} aria-label="Sponsored">
      <Image src={ad.image} alt="" fill sizes="435px" className="object-cover object-[72%_50%] opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/40 to-navy-950/90" />
      <span className="absolute top-4 right-4 rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-bold tracking-[0.96px] text-white/50">AD</span>
      <div className="relative">
        <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-xl" aria-hidden>
          🌤️
        </span>
        <p className="mt-10 text-[10px] font-bold tracking-[1.2px] text-[#c084fc]">SPONSORED</p>
        <p className="mt-1 text-lg font-extrabold">{ad.advertiser}</p>
        {ad.headline && <p className="text-sm text-[#c084fc]">{ad.headline}</p>}
        {ad.body && <p className="mt-3 max-w-[260px] text-xs leading-5 text-white/60">{ad.body}</p>}
        {ad.cta && (
          <a {...adLinkProps(ad)} className="mt-4 flex h-8 w-full max-w-[266px] items-center justify-center rounded-lg bg-purple text-xs font-semibold text-white transition hover:brightness-110">
            {ad.cta}
          </a>
        )}
      </div>
    </aside>
  );
}
