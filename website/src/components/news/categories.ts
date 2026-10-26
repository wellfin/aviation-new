import type { NewsCategory } from "@/lib/types";

/** The original categories (offline / mock data). Live categories come from the admin panel. */
export const NEWS_CATEGORIES: NewsCategory[] = ["Industry News", "FBO Network", "Regulatory", "Fuel", "Technology", "Business Aviation"];

/** Short badge labels for the original categories; any other category shows its own name. */
const SHORT_LABEL: Record<string, string> = {
  "Industry News": "Industry",
  "FBO Network": "FBO",
};

export const newsBadgeLabel = (category: NewsCategory): string => SHORT_LABEL[category] ?? category;

/** The requested category if it exists, else "all". */
export function parseNewsCategory(value: string | undefined, categories: readonly NewsCategory[] = NEWS_CATEGORIES): NewsCategory | "all" {
  return categories.find((c) => c === value) ?? "all";
}
