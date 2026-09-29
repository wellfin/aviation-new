import type { ReactNode } from "react";
import { StickyFooterAd } from "@/components/ads/StickyFooterAd";
import { CategoriesProvider } from "@/components/categories/CategoriesContext";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { listCategories } from "@/lib/data/categories";
import { getAdvertisement } from "@/lib/data/content";

// Every page is rendered per request (ads rotate on each view), so nothing here is
// prerendered at build time — the build must not need the API to be running.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [stickyAd, categories] = await Promise.all([getAdvertisement("sticky-footer"), listCategories()]);
  return (
    <CategoriesProvider categories={categories}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <StickyFooterAd ad={stickyAd} />
    </CategoriesProvider>
  );
}
