import { Search } from "lucide-react";
import { toQuery, type DirectoryParams } from "./params";

/** Navy hero with the provider search form (GET /directory, keeps active filters). */
export function DirectoryHero({ params }: { params: DirectoryParams }) {
  const keep = toQuery(params);
  return (
    <section className="bg-header-gradient mt-4 px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center text-center">
        <h1 className="text-[32px] leading-10 font-extrabold tracking-[-0.72px] text-white sm:text-[46px]">Aviation Services Directory</h1>
        <p className="pt-3 text-base leading-6 font-semibold text-white/60 sm:text-2xl">
          Browse 50,000+ verified aviation service providers across 180 countries.
        </p>
        <form action="/directory" role="search" className="mt-6 flex w-full max-w-[903px] flex-col gap-3 sm:flex-row">
          {(["category", "tier", "sort", "view"] as const).map((k) => (keep[k] ? <input key={k} type="hidden" name={k} value={keep[k]} /> : null))}
          <label className="relative flex-1">
            <span className="sr-only">Search providers</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder="Search providers, services, airports..."
              className="h-[52px] w-full rounded-[24px] border border-white/15 bg-white/8 pr-4 pl-10 text-[15px] text-white outline-none placeholder:text-subtle focus:border-brand-cyan/60 focus:ring-3 focus:ring-brand/20"
            />
          </label>
          <button
            type="submit"
            className="bg-brand-gradient h-[52px] shrink-0 rounded-[24px] px-7 text-[15px] font-semibold text-white transition hover:brightness-110 sm:w-[219px]"
          >
            Search
          </button>
        </form>
      </div>
    </section>
  );
}
