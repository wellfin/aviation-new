import { Plane } from "lucide-react";
import type { DistanceResult } from "@/lib/data/airports";
import { KM_TO_MI, KM_TO_NM, formatNumber } from "@/lib/utils";

/**
 * Server-rendered distance calculator. Submits a GET to the current airport page
 * (?from=&to=) so results are shareable; the page resolves both codes and passes the result in.
 */
export function DistanceCalculator({
  action,
  tab,
  from,
  to,
  result,
  error,
}: {
  action: string;
  tab: string;
  from: string;
  to: string;
  result: DistanceResult | null;
  error?: string;
}) {
  const field = "h-11 w-full min-w-0 bg-white px-3 font-mono text-sm text-ink uppercase outline-none placeholder:font-sans placeholder:normal-case placeholder:text-muted";
  return (
    <section aria-labelledby="distance-heading" id="distance">
      <form action={`${action}#distance`} method="get" className="rounded-xl bg-navy-900 p-4 md:px-5 md:py-5">
        <input type="hidden" name="tab" value={tab} />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          <h2 id="distance-heading" className="shrink-0 text-base font-semibold text-white">
            Airport Distance Calculator
          </h2>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex flex-1 overflow-hidden rounded-md border border-brand focus-within:ring-3 focus-within:ring-brand-cyan/40">
              <span className="flex items-center bg-brand px-3 text-sm font-medium whitespace-nowrap text-white">From :</span>
              <input name="from" defaultValue={from} required pattern="[A-Za-z0-9]{3,4}" placeholder="ICAO example : KJFK" aria-label="From airport code" className={field} />
            </label>
            <Plane className="hidden size-5 shrink-0 text-white sm:block" aria-hidden />
            <label className="flex flex-1 overflow-hidden rounded-md border border-brand focus-within:ring-3 focus-within:ring-brand-cyan/40">
              <span className="flex items-center bg-brand px-3 text-sm font-medium whitespace-nowrap text-white">To :</span>
              <input name="to" defaultValue={to} required pattern="[A-Za-z0-9]{3,4}" placeholder="ICAO example : KLAX" aria-label="To airport code" className={field} />
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <button type="submit" className="bg-brand-gradient h-11 w-full max-w-[200px] rounded-md text-lg font-medium text-white transition hover:brightness-110">
            Calculate
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        {result && (
          <div className="mt-3 grid gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-4 sm:grid-cols-4">
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
