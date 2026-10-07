export interface AdFormat {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** Optional display price, e.g. "From ₹25,000 / month" (admin-managed). */
  priceLabel?: string;
}

/** The six ad packages from the design, used when DATA_SOURCE=mock; the API serves the admin-managed list otherwise. */
export const AD_FORMATS: AdFormat[] = [
  { id: "header-banner", icon: "🖥️", title: "Header Banner", description: "Full-width banner above the fold on all pages" },
  { id: "sidebar", icon: "📌", title: "Sidebar Ads", description: "Sticky sidebar placement on directory & airport pages" },
  { id: "sponsored-cards", icon: "🎯", title: "Sponsored Cards", description: "Featured placement in search results & directory listings" },
  { id: "airport-page", icon: "✈️", title: "Airport Page Ads", description: "Exclusive placement on specific airport profile pages" },
  { id: "video", icon: "🎥", title: "Video Ads", description: "Pre-roll video on airport and provider profile pages" },
  { id: "newsletter", icon: "📬", title: "Newsletter Ads", description: "Dedicated placement in our weekly aviation intelligence newsletter" },
];

export const CUSTOM_PACKAGE = { id: "custom-package", title: "Custom advertising package" } as const;
