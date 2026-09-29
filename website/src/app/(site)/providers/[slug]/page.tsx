import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdBanner } from "@/components/ads/AdBanner";
import { SidebarAd } from "@/components/ads/SidebarAd";
import { ContactStrip } from "@/components/provider-profile/ContactStrip";
import { EnquiryForm } from "@/components/provider-profile/EnquiryForm";
import { ProfileHeader } from "@/components/provider-profile/ProfileHeader";
import { ProfileTabs } from "@/components/provider-profile/ProfileTabs";
import { RelatedProviders, UpgradeCard } from "@/components/provider-profile/SidebarCards";
import { AboutTab } from "@/components/provider-profile/tabs/AboutTab";
import { AirportsTab } from "@/components/provider-profile/tabs/AirportsTab";
import { BrochureTab } from "@/components/provider-profile/tabs/BrochureTab";
import { CertificationTab } from "@/components/provider-profile/tabs/CertificationTab";
import { FleetTab } from "@/components/provider-profile/tabs/FleetTab";
import { GalleryTab } from "@/components/provider-profile/tabs/GalleryTab";
import { ReviewsTab } from "@/components/provider-profile/tabs/ReviewsTab";
import { ServicesTab } from "@/components/provider-profile/tabs/ServicesTab";
import { TIER_RULES, profileTabs, relatedHeading, resolveTab, telHref, type ProfileTab } from "@/components/provider-profile/profile-config";
import { getAdvertisement } from "@/lib/data/content";
import { getProvider, getRelatedProviders } from "@/lib/data/providers";
import { getCategoryBySlug } from "@/lib/data/categories";
import type { Provider } from "@/lib/types";
import { firstParam, toInt } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/providers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) return { title: "Provider not found" };
  const category = await getCategoryBySlug(provider.category);
  const title = `${provider.name} — ${category?.longName ?? "Aviation Services"} in ${provider.city}, ${provider.country}`;
  return {
    title,
    description: provider.summary,
    alternates: { canonical: `/providers/${provider.slug}` },
    openGraph: { title, description: provider.summary, images: [{ url: provider.coverImage }], type: "profile" },
  };
}

function TabPanel({ tab, provider, reviewPage }: { tab: ProfileTab; provider: Provider; reviewPage: number }) {
  switch (tab) {
    case "services":
      return <ServicesTab provider={provider} />;
    case "airports":
      return <AirportsTab provider={provider} />;
    case "fleet":
      return <FleetTab fleet={provider.fleet} providerSlug={provider.slug} providerName={provider.name} acceptsEnquiries={TIER_RULES[provider.tier].enquiryForm} />;
    case "gallery":
      return <GalleryTab images={provider.gallery} name={provider.name} />;
    case "brochure":
      return <BrochureTab brochures={provider.brochures} />;
    case "certification":
      return <CertificationTab certifications={provider.certifications} providerName={provider.name} />;
    case "reviews":
      return <ReviewsTab provider={provider} page={reviewPage} />;
    default:
      return <AboutTab provider={provider} />;
  }
}

export default async function ProviderProfilePage({ params, searchParams }: PageProps<"/providers/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const provider = await getProvider(slug);
  if (!provider) notFound();

  const [related, bannerAd, sidebarAd] = await Promise.all([getRelatedProviders(provider, 4), getAdvertisement("header-banner"), getAdvertisement("sidebar")]);

  const rules = TIER_RULES[provider.tier];
  const tabs = profileTabs(provider);
  const active = resolveTab(provider, firstParam(sp.tab));
  const reviewPage = toInt(firstParam(sp.rpage), 1);
  const basePath = `/providers/${provider.slug}`;

  return (
    <div className="bg-surface pb-12">
      <AdBanner ad={bannerAd} className="pt-4" />
      <ProfileHeader provider={provider} />

      <div className="container-site">
        <div className="pt-10">
          <ContactStrip provider={provider} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <ProfileTabs tabs={tabs} active={active} basePath={basePath} premiumLabel={rules.premiumTabLabel} />
            <div id="profile-panel" aria-live="polite">
              <TabPanel tab={active} provider={provider} reviewPage={reviewPage} />
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-5" aria-label={`Contact ${provider.name}`}>
            <SidebarAd ad={sidebarAd} className="min-h-[250px]" />
            {rules.upgradeCard && <UpgradeCard />}
            {rules.enquiryForm && (
              <EnquiryForm providerSlug={provider.slug} providerName={provider.name} services={provider.services.map((s) => s.name)} phoneHref={telHref(provider.contact.phone)} />
            )}
            <RelatedProviders heading={relatedHeading(provider)} providers={related} />
          </aside>
        </div>
      </div>

      <AdBanner ad={bannerAd} className="mt-10" height="h-[72px] sm:h-[120px] md:h-[222px]" />
    </div>
  );
}
