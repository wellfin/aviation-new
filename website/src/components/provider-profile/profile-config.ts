import type { Provider, ProviderTier, ServiceCategorySlug } from "@/lib/types";

/**
 * What each listing tier shows on the public profile, as drawn in the
 * Basic / Pro / Ultra Pro frames of the design.
 */
export interface TierRules {
  /** Show the uploaded logo (Basic always gets the initials tile). */
  logo: boolean;
  /** Star rating + review count under the name in the header band. */
  headerRating: boolean;
  /** Tier pill next to the provider name. */
  tierBadge: boolean;
  /** Social icons at the end of the contact strip. */
  socials: boolean;
  /** "Send Enquiry" form + "Direct Call" in the sidebar. */
  enquiryForm: boolean;
  /** "Upgrade your listing — Get Ultra Pro" card in the sidebar. */
  upgradeCard: boolean;
  /** Company video block under the About card. */
  video: boolean;
  /** Brochure / Certification tabs carry an "ULTRA PRO" feature label. */
  premiumTabLabel: boolean;
}

export const TIER_RULES: Record<ProviderTier, TierRules> = {
  basic: { logo: false, headerRating: false, tierBadge: false, socials: false, enquiryForm: false, upgradeCard: true, video: false, premiumTabLabel: true },
  pro: { logo: true, headerRating: false, tierBadge: true, socials: true, enquiryForm: true, upgradeCard: true, video: false, premiumTabLabel: true },
  ultra_pro: { logo: true, headerRating: true, tierBadge: true, socials: true, enquiryForm: true, upgradeCard: false, video: true, premiumTabLabel: false },
};

export type ProfileTab = "about" | "services" | "airports" | "fleet" | "gallery" | "brochure" | "certification" | "reviews";

export interface TabDef {
  id: ProfileTab;
  label: string;
  premium?: boolean;
}

const CHARTER_CATEGORIES: ServiceCategorySlug[] = ["charter-operator", "charter-broker"];

export function isCharter(provider: Provider): boolean {
  return CHARTER_CATEGORIES.includes(provider.category);
}

/** Charter operators and brokers swap Services/Airports for their Aircraft Fleet. */
export function profileTabs(provider: Provider): TabDef[] {
  const middle: TabDef[] = isCharter(provider)
    ? [{ id: "fleet", label: "Aircraft Fleet" }]
    : [
        { id: "services", label: "Services" },
        { id: "airports", label: "Airports" },
      ];
  return [
    { id: "about", label: "About" },
    ...middle,
    { id: "gallery", label: "Gallery" },
    { id: "brochure", label: "Brochure", premium: true },
    { id: "certification", label: "Certification", premium: true },
    { id: "reviews", label: "Reviews" },
  ];
}

export function resolveTab(provider: Provider, requested: string | undefined): ProfileTab {
  const tabs = profileTabs(provider);
  return tabs.find((t) => t.id === requested)?.id ?? "about";
}

export function relatedHeading(provider: Provider): string {
  if (provider.category === "charter-operator") return "Related Charter Operators";
  if (provider.category === "charter-broker") return "Related Charter Brokers";
  return "Related Providers";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function websiteHref(website: string): string {
  return /^https?:\/\//.test(website) ? website : `https://${website}`;
}
