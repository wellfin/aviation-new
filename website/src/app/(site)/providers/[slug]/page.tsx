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
import { getProvider, getRelatedProviders, getSameCategoryProviders } from "@/lib/data/providers";
import { getCategoryBySlug } from "@/lib/data/categories";
import type { Provider } from "@/lib/types";
import { cn, firstParam, toInt } from "@/lib/utils";

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

/**
 * What a listing shows on each tab, per plan (Figma "Basic Details Page" / "Pro Details Page" frames):
 * `banners` ad banners `h` tall (Pro: at least `h`, stretching so the column ends level with the
 * sidebar), after the tab content when `content` is set, otherwise in its place. Tabs not listed show their
 * content; Ultra Pro always shows content.
 */
interface TabLayout {
  banners: number;
  /** Banner size: a fixed height (Basic) or a minimum height (Pro). Literal classes so Tailwind sees them. */
  size: string;
  content?: boolean;
}
const TAB_LAYOUT: Record<Provider["tier"], Partial<Record<ProfileTab, TabLayout>>> = {
  basic: {
    about: { banners: 2, size: "sm:h-[373px]" },
    fleet: { banners: 1, size: "sm:h-[653px]" },
    gallery: { banners: 2, size: "sm:h-[373px]" },
    brochure: { banners: 3, size: "sm:h-[373px]" },
    certification: { banners: 3, size: "sm:h-[373px]" },
    reviews: { banners: 3, size: "sm:h-[373px]" },
  },
  pro: {
    fleet: { banners: 3, size: "sm:min-h-[373px]" },
    gallery: { banners: 2, size: "sm:min-h-[540px]" },
    brochure: { banners: 1, size: "sm:min-h-[540px]", content: true },
    certification: { banners: 2, size: "sm:min-h-[540px]" },
    reviews: { banners: 2, size: "sm:min-h-[540px]" },
  },
  // Ultra Pro shows all content; Certification is followed by one banner (Figma).
  ultra_pro: {
    certification: { banners: 1, size: "sm:h-[235px]", content: true },
  },
};

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

  const basic = provider.tier === "basic";
  // Every plan lists same-kind listings in one sponsored card (Figma Basic / Pro / Ultra Pro frames).
  const sponsoredRelated = true;
  const [related, sameKind, bannerAd, sidebarAd] = await Promise.all([
    sponsoredRelated ? Promise.resolve([]) : getRelatedProviders(provider, 4),
    sponsoredRelated ? getSameCategoryProviders(provider, 4) : Promise.resolve([]),
    getAdvertisement("header-banner"),
    getAdvertisement("sidebar"),
  ]);

  const rules = TIER_RULES[provider.tier];
  // Charter listings name their own kind ("Related Charter Operators"); others use the category name.
  const sameKindHeading =
    relatedHeading(provider) === "Related Providers" ? `Other ${(await getCategoryBySlug(provider.category))?.name ?? "Similar"} Listings` : relatedHeading(provider);
  const tabs = profileTabs(provider);
  const active = resolveTab(provider, firstParam(sp.tab));
  const reviewPage = toInt(firstParam(sp.rpage), 1);
  const layout = TAB_LAYOUT[provider.tier][active];
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
            <div id="profile-panel" aria-live="polite" className="flex flex-1 flex-col gap-6">
              {(!layout || layout.content) && <TabPanel tab={active} provider={provider} reviewPage={reviewPage} />}
              {layout &&
                Array.from({ length: layout.banners }, (_, i) => (
                  <AdBanner
                    key={i}
                    bare
                    ad={bannerAd}
                    // Pro banners grow to meet the sidebar's bottom; Basic banners keep the drawn height.
                    className={provider.tier === "pro" ? "flex flex-1 flex-col" : undefined}
                    height={cn("h-[150px]", layout.size, provider.tier === "pro" && "sm:h-auto sm:flex-1")}
                  />
                ))}
            </div>

          </div>

          <aside className="flex min-w-0 flex-col gap-5" aria-label={`Contact ${provider.name}`}>
            <SidebarAd ad={sidebarAd} className="min-h-[250px]" />
            {/* Basic listings, Gallery / Brochure / Certification / Reviews tabs (Figma 949:6928): a second, taller side ad. */}
            {basic && ["gallery", "brochure", "certification", "reviews"].includes(active) && <SidebarAd ad={sidebarAd} className="min-h-[526px]" />}
            {rules.upgradeCard && <UpgradeCard />}
            {rules.enquiryForm && (
              <EnquiryForm providerSlug={provider.slug} providerName={provider.name} services={provider.services.map((s) => s.name)} phoneHref={telHref(provider.contact.phone)} />
            )}
            {sponsoredRelated ? (
              // Basic and Pro (Figma): one sponsored card of listings of the same kind, e.g. other charter operators.
              <RelatedProviders heading={sameKindHeading} providers={sameKind} sponsored />
            ) : (
              <RelatedProviders heading={relatedHeading(provider)} providers={related} />
            )}
          </aside>
        </div>
      </div>

      <AdBanner ad={bannerAd} className="mt-10" height="h-[72px] sm:h-[120px] md:h-[222px]" />
    </div>
  );
}
