import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import { SidebarAd } from "@/components/ads/SidebarAd";
import { PageHero, PageShell } from "@/components/company/PageShell";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { ButtonLink } from "@/components/ui/Button";
import { getAdvertisement, listFaqs } from "@/lib/data/content";
import { FAQ_CATEGORIES } from "@/lib/mock/faq";
import { cn, firstParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about the Global Aviation Services Directory — accounts, membership plans, airport search, service providers, subscriptions, data licensing, advertising and aviation tools.",
};

type Category = (typeof FAQ_CATEGORIES)[number];

function isCategory(value: string | undefined): value is Category {
  return FAQ_CATEGORIES.some((c) => c === value);
}

function faqHref(params: { q?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.category) qs.set("category", params.category);
  const s = qs.toString();
  return s ? `/faq?${s}` : "/faq";
}

export default async function FaqPage({ searchParams }: PageProps<"/faq">) {
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? "").trim().slice(0, 120);
  const rawCategory = firstParam(sp.category);
  const category = isCategory(rawCategory) ? rawCategory : undefined;

  const [all, inCategory, sidebarAd] = await Promise.all([listFaqs(), listFaqs(category), getAdvertisement("sidebar")]);
  const needle = q.toLowerCase();
  const items = needle ? inCategory.filter((f) => `${f.question} ${f.answer}`.toLowerCase().includes(needle)) : inCategory;
  const popular = all.slice(0, 5);

  const tabs: Array<{ label: string; value?: Category }> = [{ label: "All" }, ...FAQ_CATEGORIES.map((c) => ({ label: c, value: c }))];

  return (
    <PageShell
      hero={
        <PageHero
          title="Frequently Asked Questions"
          subtitle="Find answers to the most common questions about the Global Aviation Services Directory, membership plans, aviation tools, and data licensing."
          subtitleClassName="max-w-[800px]"
        >
          <form action="/faq" method="get" role="search" className="mx-auto mt-7 max-w-[520px]">
            {category && <input type="hidden" name="category" value={category} />}
            <label htmlFor="faq-search" className="sr-only">
              Search questions
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-white/50" aria-hidden />
              <input
                id="faq-search"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Search questions..."
                className="h-[52px] w-full rounded-xl border border-white/15 bg-white/8 pr-4 pl-11 text-[15px] text-white placeholder:text-white/50 outline-none transition focus:border-brand-cyan focus:bg-white/12"
              />
            </div>
          </form>
        </PageHero>
      }
    >
      <div className="container-site pt-10">
        <nav aria-label="FAQ categories" className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-2.5 sm:w-auto sm:flex-wrap">
            {tabs.map((t) => {
              const active = t.value === category;
              return (
                <li key={t.label}>
                  <Link
                    href={faqHref({ q, category: t.value })}
                    aria-current={active ? "page" : undefined}
                    scroll={false}
                    className={cn(
                      "inline-flex h-[38px] items-center rounded-xl border px-4 text-sm font-medium whitespace-nowrap transition",
                      active ? "bg-brand-gradient border-transparent text-white shadow-[0_4px_14px_rgba(47,128,237,0.3)]" : "border-line bg-white text-muted hover:border-brand/40 hover:text-brand",
                    )}
                  >
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
          <section aria-label="Questions">
            {(q || category) && (
              <p className="mb-4 text-sm text-muted" role="status">
                {items.length} {items.length === 1 ? "result" : "results"}
                {q && (
                  <>
                    {" "}
                    for <span className="font-semibold text-ink">&ldquo;{q}&rdquo;</span>
                  </>
                )}
                {category && <> in {category}</>}
                {" · "}
                <Link href="/faq" className="font-semibold text-brand hover:underline">
                  Clear filters
                </Link>
              </p>
            )}
            <FaqAccordion key={`${category ?? "all"}|${q}`} items={items} defaultOpen={q ? 0 : null} />
          </section>

          <aside className="flex flex-col gap-5">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
              <h2 className="text-base font-bold text-ink">Popular Questions</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {popular.map((f) => (
                  <li key={f.id}>
                    <Link href={faqHref({ q: f.question })} className="text-sm leading-5 text-muted transition hover:text-brand">
                      → {f.question}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-white">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand/20 text-brand-cyan" aria-hidden>
                <MessageSquare className="size-5" />
              </span>
              <h2 className="mt-5 text-base font-bold">Still have questions?</h2>
              <p className="mt-2 text-sm text-white/60">Our aviation support team is available 24/7.</p>
              <ButtonLink href="/contact" className="mt-5 w-full justify-start">
                Contact Support
              </ButtonLink>
            </div>

            <SidebarAd ad={sidebarAd} className="min-h-[300px]" />
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
