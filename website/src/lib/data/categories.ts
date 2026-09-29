import "server-only";
import { config } from "@/lib/config";
import { SERVICE_CATEGORIES } from "@/lib/mock/categories";
import { PROVIDERS } from "@/lib/mock/providers";
import type { ServiceCategory } from "@/lib/types";
import { apiGet } from "./http";

/** Active service categories in display order (admin-managed in API mode). */
export async function listCategories(): Promise<ServiceCategory[]> {
  if (config.DATA_SOURCE === "mock") {
    return SERVICE_CATEGORIES.map((c) => ({ ...c, providerCount: PROVIDERS.filter((p) => p.category === c.slug).length }));
  }
  try {
    return (await apiGet<ServiceCategory[]>("/categories", { revalidate: 60 })) ?? [];
  } catch {
    // Navigation must still render if the catalogue can't be loaded.
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<ServiceCategory | undefined> {
  return (await listCategories()).find((c) => c.slug === slug);
}
