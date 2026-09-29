"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ServiceCategory } from "@/lib/types";

interface CategoriesValue {
  categories: ServiceCategory[];
  bySlug: (slug: string) => ServiceCategory | undefined;
}

const CategoriesContext = createContext<CategoriesValue>({ categories: [], bySlug: () => undefined });

/** Makes the server-loaded service catalogue available to client components. */
export function CategoriesProvider({ categories, children }: { categories: ServiceCategory[]; children: ReactNode }) {
  const value = useMemo(() => {
    const map = new Map(categories.map((c) => [c.slug, c]));
    return { categories, bySlug: (slug: string) => map.get(slug) };
  }, [categories]);
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): CategoriesValue {
  return useContext(CategoriesContext);
}

/** Readable name of a category slug (falls back to a title-cased slug for retired categories). */
export function CategoryName({ slug, long = false }: { slug: string; long?: boolean }) {
  const c = useCategories().bySlug(slug);
  if (c) return <>{long ? c.longName : c.name}</>;
  return <>{slug.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}</>;
}

export function CategoryEmoji({ slug, fallback = "✈️" }: { slug: string; fallback?: string }) {
  return <>{useCategories().bySlug(slug)?.emoji || fallback}</>;
}
