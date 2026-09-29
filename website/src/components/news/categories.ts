import type { NewsCategory } from "@/lib/types";

export const NEWS_CATEGORIES: NewsCategory[] = ["Industry News", "FBO Network", "Regulatory", "Fuel", "Technology", "Business Aviation"];

/** Short uppercase badge label used on news cards. */
export const NEWS_BADGE_LABEL: Record<NewsCategory, string> = {
  "Industry News": "Industry",
  "FBO Network": "FBO",
  Regulatory: "Regulatory",
  Fuel: "Fuel",
  Technology: "Technology",
  "Business Aviation": "Business Aviation",
};

export function parseNewsCategory(value: string | undefined): NewsCategory | "all" {
  return NEWS_CATEGORIES.find((c) => c === value) ?? "all";
}
