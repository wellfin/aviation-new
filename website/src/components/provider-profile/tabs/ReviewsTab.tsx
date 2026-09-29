import Link from "next/link";
import { ChevronLeft, ChevronRight, Quote, Star, User } from "lucide-react";
import { listProviderReviews } from "@/lib/data/providers";
import { orFallback } from "@/lib/data/safe";
import type { Provider } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { ShareExperience } from "../ReviewForm";

const PAGE_SIZE = 4;

function PageArrow({ href, dir }: { href: string | null; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const cls = "flex size-[46px] items-center justify-center rounded-full border border-brand text-brand transition";
  const label = dir === "prev" ? "Previous reviews" : "Next reviews";
  if (!href) {
    return (
      <span className={cn(cls, "opacity-35")} aria-hidden>
        <Icon className="size-4" />
      </span>
    );
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className={cn(cls, "hover:bg-brand hover:text-white")}>
      <Icon className="size-4" />
    </Link>
  );
}

export async function ReviewsTab({ provider, page }: { provider: Provider; page: number }) {
  // Fall back to the reviews embedded in the profile if the paginated list can't be loaded.
  const embedded = {
    items: provider.reviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: provider.reviews.length,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(provider.reviews.length / PAGE_SIZE)),
  };
  const { items, page: current, totalPages } = await orFallback(listProviderReviews(provider, page, PAGE_SIZE), embedded);
  const base = `/providers/${provider.slug}?tab=reviews`;
  const pageHref = (p: number) => (p === 1 ? base : `${base}&rpage=${p}`);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[24px] bg-[#10acf9] px-6 py-8 text-center text-white md:px-16" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="text-3xl font-extrabold tracking-[-0.5px] md:text-[48px] md:leading-[64px]">
          WHAT OUR CLIENTS SAY
        </h2>
        <p className="mx-auto mt-3 max-w-[640px] text-base leading-7 text-white/95 md:text-lg">
          Discover why operators, crews and flight departments choose {provider.name}
          {provider.reviewCount > 0 && ` — rated ${provider.rating.toFixed(1)}/5 from ${formatNumber(provider.reviewCount)} reviews`}.
        </p>
        <ShareExperience providerSlug={provider.slug} providerName={provider.name} />
      </section>

      {items.length === 0 ? (
        <p className="rounded-[20px] bg-white p-6 text-center text-sm text-muted shadow-soft">No reviews yet — be the first to share your experience.</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {items.map((r) => (
            <li key={r.id} className="relative flex flex-col overflow-hidden rounded-[8px] bg-white p-6 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]">
              <span className="absolute -top-4 right-2 size-24 rounded-full bg-[#dbeafe] opacity-30" aria-hidden />
              <Quote className="size-9 fill-[#bfdbfe] text-[#bfdbfe]" aria-hidden />
              <p className="mt-4 flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={cn("size-4", i <= r.rating ? "fill-[#facc15] text-[#facc15]" : "fill-line text-line")} aria-hidden />
                ))}
              </p>
              <p className="mt-4 text-base font-bold text-ink">{r.title}</p>
              <p className="mt-1 flex-1 text-base leading-6 text-ink/90">{r.body}</p>
              <div className="mt-6 flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#dbeafe] text-brand" aria-hidden>
                  <User className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-[#111827]">{r.author}</p>
                  <p className="text-sm text-[#6b7280]">{r.role}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <nav aria-label="Review pages" className="flex items-center justify-center gap-8">
          <PageArrow dir="prev" href={current > 1 ? pageHref(current - 1) : null} />
          <span className="sr-only">
            Page {current} of {totalPages}
          </span>
          <PageArrow dir="next" href={current < totalPages ? pageHref(current + 1) : null} />
        </nav>
      )}
    </div>
  );
}
