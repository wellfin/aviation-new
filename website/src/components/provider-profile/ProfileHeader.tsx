import { Flag } from "@/components/ui/Flag";
import Image from "next/image";
import { Star } from "lucide-react";
import { ShareButton } from "@/components/providers/ProviderActions";
import { TierBadge, VerifiedBadge } from "@/components/ui/Badge";
import { CategoryName } from "@/components/categories/CategoriesContext";
import type { Provider } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { TIER_RULES, initials, websiteHref } from "./profile-config";

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1", className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= Math.round(rating) ? "fill-warning text-warning" : "fill-white/15 text-white/25")} />
      ))}
    </span>
  );
}

/** Cover band: cover photo, logo tile, name, category · country · reach, rating and actions. */
export function ProfileHeader({ provider }: { provider: Provider }) {
  const rules = TIER_RULES[provider.tier];
  const showLogo = rules.logo && provider.logo !== "";
  const path = `/providers/${provider.slug}`;

  return (
    <section className="relative mt-2 overflow-hidden bg-navy-900" aria-labelledby="provider-name">
      <Image src={provider.coverImage} alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/55 via-navy-950/70 to-navy-950/90" />
      <div className="relative container-site flex min-h-[221px] flex-col justify-end gap-5 py-6 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 items-end gap-4 md:gap-5">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border-2 border-white bg-white shadow-[0_8px_16px_rgba(11,31,58,0.2)] md:size-24">
            {showLogo ? (
              <Image src={provider.logo} alt={`${provider.name} logo`} width={96} height={96} className="size-full object-cover" />
            ) : (
              <span className="text-brand-gradient text-2xl font-extrabold md:text-3xl" aria-hidden>
                {initials(provider.name)}
              </span>
            )}
          </div>
          <div className="min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 id="provider-name" className="text-2xl leading-tight font-extrabold tracking-[-0.6px] text-white md:text-[30px] md:leading-9">
                {provider.name}
              </h1>
              {rules.tierBadge && <TierBadge tier={provider.tier} />}
              {rules.tierBadge && provider.verified && <VerifiedBadge />}
            </div>
            <p className="mt-2 text-sm text-white/55">
              <CategoryName slug={provider.category} long /> · <Flag code={provider.countryCode} /> {provider.country}
              {provider.locationsLabel && <> · {provider.locationsLabel}</>}
            </p>
            {rules.headerRating && (
              <p className="mt-2 flex items-center gap-1 text-sm" aria-label={`Rated ${provider.rating.toFixed(1)} out of 5 from ${provider.reviewCount} reviews`}>
                <Stars rating={provider.rating} />
                <span className="pl-1 font-bold text-white">{provider.rating.toFixed(1)}</span>
                <span className="text-subtle">({formatNumber(provider.reviewCount)} reviews)</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ShareButton title={provider.name} path={path} label="Share" />
          <a
            href={websiteHref(provider.contact.website)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[52px] items-center rounded-full border-[1.5px] border-brand px-7 text-[15px] font-semibold text-brand transition hover:bg-brand/10"
          >
            Visit Website
          </a>
        </div>
      </div>
    </section>
  );
}
