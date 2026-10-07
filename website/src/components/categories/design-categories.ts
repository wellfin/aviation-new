import type { ServiceCategory } from "@/lib/types";

/**
 * The 14 service categories drawn in the design (Figma 46:3402), in the menu's order. Categories
 * added later in the admin panel stay out of the Services menu and the directory's category bar;
 * their providers are listed under "All Services" / "Browse All Providers".
 */
export const DESIGN_CATEGORY_ORDER = [
  "fbo",
  "ground-handler",
  "trip-support",
  "permit",
  "fuel",
  "catering",
  "ground-transportation",
  "meet-and-assist",
  "charter-operator",
  "charter-broker",
  "supervisory-agent",
  "hotels",
  "mro",
  "other-services",
];

const DESIGN_SLUGS = new Set(DESIGN_CATEGORY_ORDER);

export const isDesignCategory = (c: ServiceCategory) => DESIGN_SLUGS.has(c.slug);

/** Design categories that exist, in the menu's order. */
export function designMenuCategories(categories: ServiceCategory[]): ServiceCategory[] {
  return DESIGN_CATEGORY_ORDER.flatMap((slug) => categories.find((c) => c.slug === slug) ?? []);
}
