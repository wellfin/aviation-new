import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { CategoryName } from "@/components/categories/CategoriesContext";
import { Flag } from "@/components/ui/Flag";
import type { Provider, ProviderTier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./ProviderActions";

const TIER_PILL: Record<ProviderTier, { label: string; className: string }> = {
  ultra_pro: { label: "Ultra Pro", className: "border-[rgba(255,215,0,0.3)] bg-[linear-gradient(163deg,rgba(255,215,0,0.15)_0%,rgba(255,180,0,0.1)_100%)] text-[#d4a400]" },
  pro: { label: "Pro", className: "border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan" },
  basic: { label: "Basic", className: "border-brand/25 bg-brand/10 text-brand" },
};

const pill = "inline-flex items-center rounded-full border-[0.755px] px-2.5 py-1 text-[11px] leading-[16.5px] font-bold tracking-[0.55px] uppercase";

/** Compact directory row for list view (Figma 12:8181). */
export function ProviderListRow({ provider }: { provider: Provider }) {
  const href = `/providers/${provider.slug}`;
  const tier = TIER_PILL[provider.tier];
  const showRating = provider.tier !== "basic" && provider.rating > 0;

  return (
    <article className="flex flex-col gap-4 rounded-[20px] bg-white px-4 py-5 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] transition hover:shadow-card sm:flex-row sm:items-center sm:py-[30px]">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Link href={href} className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-navy-900" tabIndex={-1} aria-hidden>
          <Image src={provider.coverImage} alt="" fill sizes="80px" className="object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base leading-6 font-bold text-ink">
              <Link href={href} className="hover:text-brand">
                {provider.name}
              </Link>
            </h3>
            <span className={cn(pill, tier.className)}>{tier.label}</span>
            {provider.verified && (
              <span className={cn(pill, "border-success/25 bg-success/12 text-success")} title="Verified provider" aria-label="Verified provider">
                ✓
              </span>
            )}
          </div>
          <p className="pt-1 text-xs leading-4 text-subtle">
            <Flag code={provider.countryCode} /> {provider.country} · <CategoryName slug={provider.category} />
          </p>
          <p className="truncate pt-1 text-sm leading-5 text-muted">{provider.summary}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 self-end sm:self-auto">
        {showRating && (
          <p className="flex items-center gap-1" aria-label={`Rated ${provider.rating} out of 5`}>
            <Star className="size-3 fill-warning text-warning" aria-hidden />
            <span className="text-sm leading-5 font-bold text-ink">{provider.rating.toFixed(1)}</span>
          </p>
        )}
        <div className="flex items-center gap-2">
          <Link href={href} className="bg-brand-gradient flex h-10 items-center rounded-3xl px-4 text-[13px] font-semibold text-white transition hover:brightness-110">
            View
          </Link>
          <FavoriteButton providerId={provider.id} tone="light" />
        </div>
      </div>
    </article>
  );
}
