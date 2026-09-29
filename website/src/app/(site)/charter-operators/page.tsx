import type { Metadata } from "next";
import { AdBanner } from "@/components/ads/AdBanner";
import { SidebarAd } from "@/components/ads/SidebarAd";
import { CharterHero } from "@/components/charter/CharterHero";
import { CharterSearchForm } from "@/components/charter/CharterSearchForm";
import { SponsoredCard } from "@/components/charter/SponsoredCard";
import { loadCharterOperators } from "@/components/charter/data";
import { buildLocationOptions } from "@/components/charter/filters";
import { getAdvertisement } from "@/lib/data/content";

export const metadata: Metadata = {
  title: "Search Air Charter Operators",
  description: "Find verified air charter operators worldwide. Search by company name, location, aircraft type and safety certification.",
};

export default async function CharterSearchPage() {
  const [operators, bannerAd, sidebarAd, stripAd] = await Promise.all([
    loadCharterOperators(),
    getAdvertisement("header-banner"),
    getAdvertisement("sidebar"),
    getAdvertisement("sponsored-strip"),
  ]);

  return (
    <>
      <AdBanner ad={bannerAd} className="pt-6" />
      <CharterHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Directory", href: "/directory" }, { label: "Charter Operators" }]}
        title="Search Air Charter Operators"
        subtitle="Find verified air charter operators worldwide. Search by location, aircraft type, and company name."
      />
      <AdBanner ad={bannerAd} className="pt-6" />

      <div className="container-site grid gap-8 pt-14 pb-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,890px)_429px] xl:justify-between">
        <CharterSearchForm locations={buildLocationOptions(operators)} />
        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <SidebarAd ad={sidebarAd} className="min-h-[320px] lg:min-h-[467px]" />
          <SponsoredCard ad={stripAd} />
        </div>
      </div>

      <AdBanner ad={bannerAd} height="h-[150px] sm:h-[222px]" className="pt-6 pb-8" />
    </>
  );
}
