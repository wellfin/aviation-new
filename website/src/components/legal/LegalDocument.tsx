import { PageHero, PageShell } from "@/components/company/PageShell";
import { LegalBlocks } from "./LegalBlocks";
import { LegalToc } from "./LegalToc";
import type { LegalDoc } from "./types";

/**
 * Shared layout for every legal page: breadcrumb hero with "Last updated",
 * sticky numbered table of contents (active section tracked on scroll) and body.
 */
export function LegalDocument({ doc }: { doc: LegalDoc }) {
  const toc = doc.sections.map((s) => ({ id: s.id, label: s.label }));
  return (
    <PageShell
      hero={
        <PageHero
          title={doc.title}
          subtitle={doc.summary}
          crumbs={[{ label: "Home", href: "/" }, { label: "Legal" }, { label: doc.crumb }]}
        >
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-white/45">
            {doc.badge && (
              <span className="rounded-full border border-success/40 bg-success/10 px-3 py-1 text-[11px] font-bold tracking-[0.6px] text-success uppercase">
                {doc.badge}
              </span>
            )}
            <span>{doc.updated}</span>
          </div>
        </PageHero>
      }
    >
      <div className="container-site grid items-start gap-8 pt-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-24">
          <LegalToc title={doc.tocTitle} items={toc} footer={doc.tocFooter} />
        </aside>

        <article className="flex min-w-0 flex-col gap-12">
          {doc.lead && (
            <div className="flex flex-col gap-5">
              <LegalBlocks blocks={doc.lead} />
            </div>
          )}
          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} className="scroll-mt-24">
              <h2 id={`${s.id}-heading`} className="border-b border-line pb-3 text-xl font-bold tracking-[-0.3px] text-ink sm:text-[22px]">
                {doc.numberedHeadings && `${i + 1}. `}
                {s.heading ?? s.label}
              </h2>
              <div className="mt-5 flex flex-col gap-4">
                <LegalBlocks blocks={s.blocks} />
              </div>
            </section>
          ))}
        </article>
      </div>
    </PageShell>
  );
}
