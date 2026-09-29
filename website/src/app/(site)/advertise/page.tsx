import type { Metadata } from "next";
import { AdBanner } from "@/components/ads/AdBanner";
import { AdvertiseFormats } from "@/components/advertise/AdvertiseFormats";
import { getAdvertisement, listAdFormats } from "@/lib/data/content";
import { orFallback } from "@/lib/data/safe";

export const metadata: Metadata = {
  title: "Advertise — Reach 2.4M+ Aviation Professionals Monthly",
  description: "Premium advertising placements targeting pilots, operators, FBO managers and aviation businesses worldwide: banners, sidebar, sponsored cards, airport pages, video and newsletter ads.",
};

export default async function AdvertisePage() {
  const [banner, formats] = await Promise.all([getAdvertisement("header-banner"), orFallback(listAdFormats(), [])]);
  return (
    <div className="bg-[#f7fafc]">
      <section className="bg-header-gradient px-4 py-16 text-center md:px-6">
        <h1 className="text-[34px] leading-[1.1] font-extrabold tracking-[-0.96px] text-white md:text-[48px] md:leading-[48px]">
          Reach 2.4M+ Aviation
          <span className="text-brand-gradient block pb-1.5">Professionals Monthly</span>
        </h1>
        <p className="mx-auto max-w-[920px] pt-2.5 text-base leading-7 text-white/60 md:text-lg">
          Premium advertising placements targeting pilots, operators, FBO managers, and aviation businesses worldwide.
        </p>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-6">
        <AdvertiseFormats formats={formats} />
      </div>

      <AdBanner ad={banner} height="h-[72px] sm:h-[120px] md:h-[222px]" className="pb-9" />
    </div>
  );
}
