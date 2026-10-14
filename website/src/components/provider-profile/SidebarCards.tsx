import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Provider } from "@/lib/types";
import { CategoryEmoji } from "@/components/categories/CategoriesContext";

const card = "rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]";

/** A list of other listings. `sponsored` adds the AD badge (Basic profiles, Figma 949:5893). */
export function RelatedProviders({ heading, providers, sponsored = false, id = "related-heading" }: { heading: string; providers: Provider[]; sponsored?: boolean; id?: string }) {
  return (
    <section aria-labelledby={id} className={card}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-sm font-bold text-ink">
          {heading}
        </h2>
        {sponsored && (
          <span className="rounded-full border border-success/25 bg-success/12 px-2 py-0.5 text-[8px] font-bold tracking-[0.55px] text-success uppercase">ad</span>
        )}
      </div>
      {providers.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No related listings yet.</p>
      ) : (
        <ul className="mt-3">
          {providers.map((p) => (
            <li key={p.slug}>
              <Link href={`/providers/${p.slug}`} className="group flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-ink transition hover:text-brand">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/8 text-sm" aria-hidden>
                  <CategoryEmoji slug={p.category} />
                </span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <ChevronRight className="size-3 text-subtle transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Shown on Basic and Pro listings, nudging the owner towards Ultra Pro. */
export function UpgradeCard() {
  return (
    <section className="rounded-[20px] border border-white/10 bg-gradient-to-br from-navy-900 to-navy-800 p-4 text-white shadow-card" aria-labelledby="upgrade-heading">
      <p className="text-[10px] font-medium tracking-[1px] text-white/50">UPGRADE YOUR LISTING</p>
      <h2 id="upgrade-heading" className="mt-3 text-base font-bold">
        Get Ultra Pro
      </h2>
      <p className="mt-1 text-xs text-white/60">Priority placement, verified badge &amp; analytics dashboard</p>
      <Link
        href="/pricing"
        className="mt-3 inline-flex h-6 items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 text-[11px] font-bold tracking-[0.5px] text-warning transition hover:bg-warning/20"
      >
        VIEW PLANS →
      </Link>
    </section>
  );
}
