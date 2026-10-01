import Image from "next/image";
import type { DistanceResult } from "@/lib/data/airports";
import { cn } from "@/lib/utils";
import { KM_TO_MI, KM_TO_NM, formatNumber } from "@/lib/utils";

/** One "From :" / "To :" code field: gradient label block, divider, input (Figma 752:7828). */
function CodeField({ name, label, defaultValue, placeholder, ariaLabel }: { name: "from" | "to"; label: string; defaultValue: string; placeholder: string; ariaLabel: string }) {
  return (
    <label className="flex h-14 min-w-0 flex-1 basis-0 overflow-hidden rounded-lg border border-[#f8f8f8] bg-white transition focus-within:border-brand-cyan">
      <span className="flex w-[65px] shrink-0 items-center justify-center bg-[linear-gradient(140.28deg,#2f80ed_0%,#00c2ff_100%)] text-base font-semibold whitespace-nowrap text-[#ebebeb]">{label}</span>
      {/* 16px divider between the label block and the input, as drawn in the design. */}
      <span className="flex w-[9px] shrink-0 items-center justify-center" aria-hidden>
        <Image src="/images/airport/calc-divider.svg" alt="" width={16} height={2} className="h-[1.5px] w-4 max-w-none rotate-90" />
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        required
        pattern="[A-Za-z0-9]{3,4}"
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-0 min-w-0 flex-1 bg-transparent pr-3 pl-1 text-sm text-ink uppercase outline-none placeholder:text-[#64748b] placeholder:normal-case"
      />
    </label>
  );
}

/**
 * Server-rendered distance calculator (Figma 752:7836). Submits a GET to the current airport
 * page (?from=&to=) so results are shareable; the page resolves both codes and passes the result in.
 */
export function DistanceCalculator({
  action,
  tab,
  from,
  to,
  result,
  error,
  className,
}: {
  action: string;
  tab: string;
  from: string;
  to: string;
  result: DistanceResult | null;
  error?: string;
  className?: string;
}) {
  return (
    <section aria-labelledby="distance-heading" id="distance" className={cn("scroll-mt-24", className)}>
      <form action={`${action}#distance`} method="get" className="flex flex-col items-center gap-6 xl:gap-8">
        <input type="hidden" name="tab" value={tab} />
        <div className="flex w-full flex-col gap-4 rounded-[10px] bg-navy-900 p-5 xl:h-[97px] xl:flex-row xl:items-center xl:gap-0 xl:px-7 xl:pt-[22px] xl:pb-[15px]">
          {/* 294px title column at full width, so the first field starts where the design puts it. */}
          <h2 id="distance-heading" className="shrink-0 text-lg font-semibold whitespace-nowrap text-white xl:w-[294px] xl:text-xl">
            Airport Distance Calculator
          </h2>
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
            <CodeField name="from" label="From :" defaultValue={from} placeholder="ICAO example : KJFK" ariaLabel="From airport code" />
            <span className="hidden w-[60px] shrink-0 items-center justify-center sm:flex xl:w-[110px]" aria-hidden>
              <Image src="/images/airport/calc-plane.svg" alt="" width={22} height={22} className="size-[22px] rotate-45" />
            </span>
            <CodeField name="to" label="To :" defaultValue={to} placeholder="ICAO example : KLAX" ariaLabel="To airport code" />
          </div>
        </div>
        <button type="submit" className="bg-brand-gradient h-14 w-full max-w-[329px] rounded-[7px] text-2xl leading-6 font-semibold text-white transition hover:brightness-110">
          Calculate
        </button>
      </form>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        {result && (
          <div className="mt-4 grid gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-4 sm:grid-cols-4">
            <p className="text-sm font-bold text-ink sm:col-span-4">
              {result.from.icao} ({result.from.shortName}) → {result.to.icao} ({result.to.shortName})
            </p>
            {[
              ["Kilometres", `${formatNumber(Math.round(result.distanceKm))} km`],
              ["Nautical miles", `${formatNumber(Math.round(result.distanceKm * KM_TO_NM))} NM`],
              ["Statute miles", `${formatNumber(Math.round(result.distanceKm * KM_TO_MI))} mi`],
              ["Initial bearing", `${Math.round(result.bearingDeg)}° true`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white px-3 py-2.5 shadow-soft">
                <p className="text-[10px] font-bold tracking-[0.6px] text-subtle uppercase">{label}</p>
                <p className="mt-0.5 text-base font-extrabold text-ink">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
