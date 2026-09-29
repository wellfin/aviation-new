import Image from "next/image";
import type { Advertisement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adLinkProps } from "./ad-link";

/**
 * Full-width creative banner ("Your Global Partner in Aviation Services").
 * The creative is a single image; the whole banner is the click target.
 */
export function AdBanner({ ad, className, height = "h-[150px]" }: { ad: Advertisement | null; className?: string; height?: string }) {
  if (!ad) return null;
  return (
    <div className={cn("container-site", className)}>
      <a
        {...adLinkProps(ad)}
        // Below `sm` the creative is shown at its native ratio so the copy is never cropped.
        className={cn("relative block overflow-hidden rounded-[19px] bg-navy-900 max-sm:aspect-[2172/411] max-sm:h-auto max-sm:rounded-xl", height)}
        aria-label={`Advertisement: ${ad.headline ?? ad.advertiser}`}
      >
        <Image src={ad.image} alt={ad.headline ?? ad.advertiser} fill sizes="(max-width: 1400px) 100vw, 1350px" className="object-cover object-center" />
        {/* The creative carries its own visible "Ad" tab. */}
        <span className="sr-only">Advertisement</span>
      </a>
    </div>
  );
}
