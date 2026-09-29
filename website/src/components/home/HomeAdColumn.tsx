import Image from "next/image";
import { cn } from "@/lib/utils";

/** The "AD" marker pill shown on every sponsored creative. */
export function AdMarker({ className }: { className?: string }) {
  return (
    <span className={cn("absolute top-[18px] right-[19px] rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[8px] leading-3 font-bold tracking-[0.96px] text-white/60", className)}>
      AD
    </span>
  );
}

const CREATIVES = [
  { src: "/images/home/ad-international-airlines.png", alt: "International Airlines advertisement", height: "lg:h-[458px]" },
  { src: "/images/home/ad-utility-air.png", alt: "Utility Air — enquire now and go into the draw to win a pilot's watch. 02 9924 6282, sales@utilityair.com", height: "lg:h-[599px]" },
  { src: "/images/home/ad-island-banner.png", alt: "Aerial banner-tow advertisement over a coastline", height: "lg:h-[560px]" },
] as const;

/** Right-hand column of static display-ad creatives running beside the news and "Trusted by" blocks. */
export function HomeAdColumn({ className }: { className?: string }) {
  return (
    <aside aria-label="Advertisements" className={cn("grid grid-cols-1 gap-5 sm:grid-cols-3 lg:flex lg:flex-col", className)}>
      {CREATIVES.map((c) => (
        <figure key={c.src} className={cn("relative h-[420px] overflow-hidden rounded-[35px] bg-navy-900", c.height)}>
          <Image src={c.src} alt={c.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 300px" className="object-cover" />
          <AdMarker />
        </figure>
      ))}
    </aside>
  );
}
