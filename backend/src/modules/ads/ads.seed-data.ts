import type { AdPlacement } from "./ad.model.js";

export interface AdSeed {
  placement: AdPlacement;
  advertiser: string;
  headline?: string;
  body?: string;
  image: string;
  href: string;
  cta?: string;
}

/** Demo ads copied from website/src/lib/mock/ads.ts. */
export const ADS_SEED: AdSeed[] = [
  {
    placement: "header-banner",
    advertiser: "Global Aviation Services",
    headline: "Your Global Partner in Aviation Services",
    body: "Connect with trusted FBOs, ground handlers, and aviation service providers worldwide.",
    image: "/images/shared/ad-global-partner.png",
    href: "/directory",
    cta: "Explore Services",
  },
  {
    placement: "sponsored-strip",
    advertiser: "World Fuel Services",
    headline: "Competitive Avgas & Jet-A Pricing",
    body: "Real-time fuel quotes at 8,000+ airports across 200+ countries",
    image: "/images/shared/ad-world-fuel-services.jpg",
    href: "/providers/world-fuel-services",
    cta: "Get a Quote",
  },
  {
    placement: "sidebar",
    advertiser: "Universal Weather",
    headline: "End-to-End Trip Support",
    body: "Permits, handling, weather & 24/7 ops support worldwide",
    image: "/images/shared/ad-universal-weather-bg.jpg",
    href: "/providers/universal-weather",
    cta: "Plan Your Trip →",
  },
  {
    placement: "sticky-footer",
    advertiser: "American Flight Support",
    image: "/images/shared/sticky-ad-american-flight-support.png",
    href: "https://americanflightsupport.com",
  },
];
