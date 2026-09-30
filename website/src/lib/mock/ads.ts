import type { Advertisement } from "@/lib/types";

export const ADS: Advertisement[] = [
  {
    id: "ad-global-partner",
    placement: "header-banner",
    advertiser: "Global Aviation Services",
    headline: "Your Global Partner in Aviation Services",
    body: "Connect with trusted FBOs, ground handlers, and aviation service providers worldwide.",
    image: "/images/shared/ad-global-partner-bg.jpg",
    href: "/directory",
    cta: "Explore Services",
  },
  {
    id: "ad-world-fuel",
    placement: "sponsored-strip",
    advertiser: "World Fuel Services",
    headline: "Competitive Avgas & Jet-A Pricing",
    body: "Real-time fuel quotes at 8,000+ airports across 200+ countries",
    image: "/images/shared/ad-world-fuel-services.jpg",
    href: "/providers/world-fuel-services",
    cta: "Get a Quote",
  },
  {
    id: "ad-universal-weather",
    placement: "sidebar",
    advertiser: "Universal Weather",
    headline: "End-to-End Trip Support",
    body: "Permits, handling, weather & 24/7 ops support worldwide",
    image: "/images/shared/ad-universal-weather-bg.jpg",
    href: "/providers/universal-weather",
    cta: "Plan Your Trip →",
  },
  {
    id: "ad-american-flight-support",
    placement: "sticky-footer",
    advertiser: "American Flight Support",
    headline: "Trip Support, Handling & Fuel Across the Americas",
    body: "24/7 flight operations support for business aviation.",
    image: "/images/shared/ad-american-flight-support-bg.jpg",
    href: "https://americanflightsupport.com",
    cta: "Learn More",
  },
];
