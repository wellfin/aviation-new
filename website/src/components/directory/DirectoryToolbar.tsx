import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkSelect } from "./LinkSelect";
import { MoreServicesMenu } from "./MoreServicesMenu";
import type { ServiceCategory } from "@/lib/types";
import { SORT_OPTIONS, directoryHref, splitCategories, type DirectoryParams } from "./params";

const pill = "shrink-0 rounded-full px-[11px] py-1.5 text-xs leading-4 font-semibold whitespace-nowrap text-white transition";

/** Category pill bar + sort select + grid/list toggle. */
export function DirectoryToolbar({ params, categories }: { params: DirectoryParams; categories: ServiceCategory[] }) {
  const { primary, more } = splitCategories(categories);
  const pills = [{ slug: "all" as const, name: "All Services" }, ...primary];

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div className="flex min-w-0 items-center gap-1.5 rounded-[12px] bg-navy-900 py-[5px] pr-1.5 pl-2 xl:flex-1">
        <nav aria-label="Service categories" className="scrollbar-none flex min-w-0 flex-1 items-center overflow-x-auto">
          {pills.map((c) => {
            const active = params.category === c.slug;
            return (
              <Link
                key={c.slug}
                href={directoryHref(params, { category: c.slug })}
                aria-current={active ? "page" : undefined}
                className={cn(pill, active ? "bg-brand-gradient" : "hover:bg-white/10")}
              >
                {c.name}
              </Link>
            );
          })}
        </nav>
        <MoreServicesMenu
          activeSlug={params.category}
          items={more.map((c) => ({ slug: c.slug, label: c.name, href: directoryHref(params, { category: c.slug }) }))}
        />
      </div>

      <div className="flex items-center gap-3">
        <LinkSelect
          label="Sort providers"
          value={params.sort}
          prefix="Sort: "
          className="min-w-0 flex-1 sm:w-[150px] sm:flex-none"
          options={SORT_OPTIONS.map((o) => ({ ...o, href: directoryHref(params, { sort: o.value }) }))}
        />
        <div className="flex shrink-0 overflow-hidden rounded-[12px] border border-line bg-white" role="group" aria-label="Layout">
          {(
            [
              { view: "grid", label: "Grid view", Icon: LayoutGrid },
              { view: "list", label: "List view", Icon: List },
            ] as const
          ).map(({ view, label, Icon }) => {
            const active = params.view === view;
            return (
              <Link
                key={view}
                href={directoryHref(params, { view })}
                scroll={false}
                aria-label={label}
                aria-current={active ? "true" : undefined}
                className={cn("flex size-10 items-center justify-center transition", active ? "bg-navy-900 text-white" : "text-ink hover:bg-surface")}
              >
                <Icon className="size-3.5" aria-hidden />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
