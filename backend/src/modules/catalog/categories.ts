/** Service categories (kept in sync with the frontend's SERVICE_CATEGORIES). */
export const CATEGORY_SLUGS = [
  "fbo",
  "ground-handler",
  "trip-support",
  "permit",
  "fuel",
  "catering",
  "ground-transportation",
  "charter-operator",
  "charter-broker",
  "supervisory-agent",
  "mro",
  "meet-and-assist",
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const PROVIDER_TIERS = ["basic", "pro", "ultra_pro"] as const;
export type ProviderTier = (typeof PROVIDER_TIERS)[number];

export const TIER_RANK: Record<ProviderTier, number> = { basic: 1, pro: 2, ultra_pro: 3 };

export const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America", "Antarctica"] as const;
