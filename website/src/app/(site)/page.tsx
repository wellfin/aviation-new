import type { Metadata } from "next";
import { AdBanner } from "@/components/ads/AdBanner";
import { SponsoredStrip } from "@/components/ads/SponsoredStrip";
import { DistanceCalculator } from "@/components/home/DistanceCalculator";
import { EcosystemSection } from "@/components/home/EcosystemSection";
import { FeaturedAirports } from "@/components/home/FeaturedAirports";
import { HomeAdColumn } from "@/components/home/HomeAdColumn";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeHero } from "@/components/home/HomeHero";
import { JoinNetworkCard } from "@/components/home/JoinNetworkCard";
import { ListBusinessCta } from "@/components/home/ListBusinessCta";
import { LogoShowcase } from "@/components/home/LogoShowcase";
import { NewsGrid } from "@/components/home/NewsGrid";
import { NewsletterResultBanner, type NewsletterResult } from "@/components/home/NewsletterResultBanner";
import { TrustedSection } from "@/components/home/TrustedSection";
import { ToolTiles } from "@/components/tools/ToolTiles";
import { getFeaturedAirports } from "@/lib/data/airports";
import { getAdvertisement, listFaqs, listNews } from "@/lib/data/content";
import { orFallback } from "@/lib/data/safe";
import { firstParam } from "@/lib/utils";

const NEWSLETTER_RESULTS: readonly NewsletterResult[] = ["confirmed", "invalid", "unsubscribed"];

export const metadata: Metadata = {
  title: { absolute: "Global Aviation Services Directory — Airports, FBOs & Aviation Tools" },
  description:
    "Your aviation command center: search 20,000+ verified FBOs, ground handlers and service providers at airports in 180+ countries, with live weather, NOTAMs, runway diagrams and distance tools.",
};

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const newsletter = NEWSLETTER_RESULTS.find((r) => r === firstParam(sp.newsletter));
  // Every home section is secondary: an API outage empties sections instead of failing the page.
  const [featuredAirports, news, faqs, sponsoredAd, bannerAd] = await Promise.all([
    orFallback(getFeaturedAirports(), []),
    orFallback(listNews({ pageSize: 9 }), { items: [], total: 0, page: 1, pageSize: 9, totalPages: 1 }),
    orFallback(listFaqs(), []),
    getAdvertisement("sponsored-strip"),
    getAdvertisement("header-banner"),
  ]);

  return (
    <>
      {newsletter && <NewsletterResultBanner result={newsletter} />}
      <HomeHero />

      <div className="bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f8_12%,#f3f4f8_100%)]">
        <div className="container-site relative z-10 -mt-10.75 grid gap-4.5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-3">
            {/* The tiles take the spare height so the calculator ends level with the card on the right. */}
            <ToolTiles fill className="lg:flex-1" />
            <DistanceCalculator />
          </div>
          <JoinNetworkCard />
        </div>

        <EcosystemSection />

        <div className="container-site grid gap-4.5 pb-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <NewsGrid articles={news.items} />
            <TrustedSection />
          </div>
          <HomeAdColumn className="lg:pt-17" />
        </div>
      </div>

      <FeaturedAirports airports={featuredAirports} />

      {sponsoredAd && (
        <div className="container-site py-8">
          <SponsoredStrip ad={sponsoredAd} tall />
        </div>
      )}

      <ListBusinessCta />
      <LogoShowcase />
      <HomeFaq items={faqs.slice(0, 4)} />
      <AdBanner ad={bannerAd} className="py-8" height="h-[140px] sm:h-[180px] lg:h-[222px]" />
    </>
  );
}
