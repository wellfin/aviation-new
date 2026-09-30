export interface AdFormat {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** Optional display price, e.g. "From ₹25,000 / month" (admin-managed). */
  priceLabel?: string;
}

/** Demo ad packages (one per website placement) used when DATA_SOURCE=mock; the API serves the admin-managed list otherwise. */
export const AD_FORMATS: AdFormat[] = [
  { id: "header-banner", icon: "🖥️", title: "Header Banner", description: "Full-width banner at the top and bottom of the directory, airport, provider, news, tools and other key pages" },
  { id: "sidebar", icon: "📌", title: "Sidebar Ads", description: "Sponsor card beside charter, airport, provider, FAQ and news content" },
  { id: "sponsored-cards", icon: "🎯", title: "Sponsored Cards", description: "Featured strip between directory and charter results, plus sponsor cards on the home, charter and news pages" },
  { id: "sticky-footer", icon: "📢", title: "Sticky Footer", description: "Collapsible bar pinned to the bottom of every page on desktop" },
];

export const CUSTOM_PACKAGE = { id: "custom-package", title: "Custom advertising package" } as const;
