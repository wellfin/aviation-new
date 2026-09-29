import { Flag } from "@/components/ui/Flag";
import Image from "next/image";
import Link from "next/link";
import { Phone, Star } from "lucide-react";
import { TierBadge, VerifiedBadge } from "@/components/ui/Badge";
import { CategoryEmoji, CategoryName } from "@/components/categories/CategoriesContext";
import type { Provider } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { FavoriteButton, ShareButton } from "./ProviderActions";

/** Directory grid card (list view uses ProviderListRow). */
export function ProviderCard({ provider }: { provider: Provider }) {
  const href = `/providers/${provider.slug}`;
  const showRating = provider.tier !== "basic";

  return (
    <article className="group flex flex-col overflow-hidden rounded-[20px] border border-brand/10 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card">
      <div className={"relative h-[192px] w-full shrink-0 overflow-hidden bg-navy-900"}>
        <Image src={provider.coverImage} alt="" fill sizes="(max-width: 768px) 100vw, 440px" className="object-cover opacity-85 transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent to-50%" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <TierBadge tier={provider.tier} />
          {provider.verified && provider.tier === "ultra_pro" && <VerifiedBadge />}
        </div>
        <div className="absolute top-3 right-3 flex gap-1.5">
          <FavoriteButton providerId={provider.id} tone="dark" />
          <ShareButton title={provider.name} path={href} tone="dark" />
        </div>
        <span className="absolute bottom-3 left-3 text-[30px] drop-shadow" aria-hidden>
          <CategoryEmoji slug={provider.category} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base leading-6 font-bold text-ink">
            <Link href={href} className="hover:text-brand">
              {provider.name}
            </Link>
          </h3>
          {showRating && (
            <p className="flex shrink-0 items-center gap-1 text-xs" aria-label={`Rated ${provider.rating} out of 5 from ${provider.reviewCount} reviews`}>
              <Star className="size-3 fill-warning text-warning" aria-hidden />
              <span className="font-bold text-ink">{provider.rating.toFixed(1)}</span>
              <span className="text-subtle">({formatNumber(provider.reviewCount)})</span>
            </p>
          )}
        </div>
        <p className="mt-1 text-xs text-subtle">
          <Flag code={provider.countryCode} /> {provider.country} · <CategoryName slug={provider.category} />
        </p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-[22.75px] text-muted">{provider.summary}</p>
        <div className="mt-4 flex items-center gap-2">
          <Link href={href} className="bg-brand-gradient flex h-10 flex-1 items-center justify-start rounded-[25px] px-7 text-[13px] font-semibold text-white transition hover:brightness-110">
            View Profile
          </Link>
          <a
            href={`tel:${provider.contact.phone.replace(/[^\d+]/g, "")}`}
            aria-label={`Call ${provider.name}`}
            className="flex size-10 items-center justify-center rounded-[12px] border border-brand/20 bg-brand/8 text-brand transition hover:bg-brand/12"
          >
            <Phone className="size-3.5" />
          </a>
          <ShareButton title={provider.name} path={href} tone="light" />
        </div>
      </div>
    </article>
  );
}
