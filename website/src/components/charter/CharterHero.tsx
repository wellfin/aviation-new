import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";

/** Navy page header used by the charter search and results pages. */
export function CharterHero({ crumbs, title, subtitle }: { crumbs: Crumb[]; title: string; subtitle?: string }) {
  return (
    <section className="bg-header-gradient mt-4">
      <div className="container-site py-12 sm:py-14">
        <Breadcrumbs items={crumbs} className="text-xs" />
        <div className="mx-auto flex max-w-[640px] flex-col items-center pt-6 text-center">
          <h1 className="text-[28px] leading-10 font-extrabold tracking-[-0.5px] text-white sm:text-4xl">{title}</h1>
          {subtitle && <p className="pt-3 text-base leading-6 text-white/60">{subtitle}</p>}
        </div>
      </div>
    </section>
  );
}
