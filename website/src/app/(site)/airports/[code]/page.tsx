import { Flag } from "@/components/ui/Flag";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AdBanner } from "@/components/ads/AdBanner";
import { SidebarAd } from "@/components/ads/SidebarAd";
import { AirportHero } from "@/components/airport/AirportHero";
import { AirportTabs } from "@/components/airport/AirportTabs";
import { DistanceCalculator } from "@/components/airport/DistanceCalculator";
import { InfoGrid, type InfoField } from "@/components/airport/InfoGrid";
import { LocationMap } from "@/components/airport/LocationMap";
import { NearbyList } from "@/components/airport/NearbyList";
import { ProviderRow } from "@/components/airport/ProviderRow";
import { AIRPORT_TYPE_LABEL, airportHref, parseTab } from "@/components/airport/routes";
import { RunwaysPanel } from "@/components/airport/RunwaysPanel";
import { ServiceSidebar } from "@/components/airport/ServiceSidebar";
import { SimpleRows } from "@/components/airport/SimpleRows";
import { SkyscraperAd } from "@/components/airport/SkyscraperAd";
import { WeatherPanels } from "@/components/airport/WeatherPanels";
import { ToolTiles } from "@/components/tools/ToolTiles";
import { getAirport, getDistance, getNearbyAirports } from "@/lib/data/airports";
import { listCategories } from "@/lib/data/categories";
import { getAdvertisement } from "@/lib/data/content";
import { getProvidersAtAirport } from "@/lib/data/providers";
import { orFallback } from "@/lib/data/safe";
import { getNotams } from "@/lib/integrations/notams";
import { getMetar, getTaf } from "@/lib/integrations/weather";
import type { Airport, Provider, ServiceCategorySlug } from "@/lib/types";
import { firstParam, formatNumber } from "@/lib/utils";

const NEARBY_RADIUS_KM = 250;

export async function generateMetadata({ params }: PageProps<"/airports/[code]">): Promise<Metadata> {
  const { code } = await params;
  const airport = await getAirport(code);
  if (!airport) return { title: "Airport not found" };
  const codes = [airport.icao, airport.iata].filter(Boolean).join(" / ");
  return {
    title: `${airport.name} (${codes}) — FBOs, Handlers, Weather & Runways`,
    description: `Aviation services at ${airport.name}, ${airport.city}, ${airport.country}: FBOs, ground handlers, fuel and trip support providers, live METAR/TAF, runways, frequencies and nearby airports.`,
    alternates: { canonical: `/airports/${airport.icao.toLowerCase()}` },
  };
}

/** Providers at the airport grouped into a comma-separated list of profile links. */
function providerLinks(providers: Provider[], ...categories: ServiceCategorySlug[]) {
  const list = providers.filter((p) => categories.includes(p.category));
  if (list.length === 0) return "No listed providers";
  return (
    <>
      {list.map((p, i) => (
        <span key={p.slug}>
          {i > 0 && ", "}
          <Link href={`/providers/${p.slug}`} className="text-brand hover:underline">
            {p.name}
          </Link>
        </span>
      ))}
    </>
  );
}

function infoFields(a: Airport, providers: Provider[]): { fields: InfoField[]; more: InfoField[] } {
  const ils = [...new Set(a.runways.map((r) => r.ils).filter(Boolean))];
  const longest = a.runways.reduce<Airport["runways"][number] | null>((m, r) => (!m || r.lengthFt > m.lengthFt ? r : m), null);
  const lit = a.runways.filter((r) => r.lighting).length;
  return {
    fields: [
      { label: "Airport Name", value: a.name },
      { label: "ICAO Code", value: a.icao },
      { label: "IATA Code", value: a.iata || "—" },
      { label: "City Name", value: a.city },
      { label: "Country Name", value: a.country },
      { label: "Country Flag", value: <Flag code={a.countryCode} label={`Flag of ${a.country}`} className="h-5 w-[30px]" /> },
      { label: "Airport Type", value: AIRPORT_TYPE_LABEL[a.type] ?? a.type },
      { label: "Lat/Long", value: `${a.lat.toFixed(4)}, ${a.lon.toFixed(4)}` },
    ],
    more: [
      { label: "Region", value: a.region },
      { label: "Approaches", value: ils.length ? `ILS ${ils.join(", ")}` : "Visual / non-precision" },
      { label: "Elevation (ft)", value: `${formatNumber(a.elevationFt)} ft (${formatNumber(Math.round(a.elevationFt * 0.3048))} m)` },
      { label: "UTC", value: `${a.utcOffset} (${a.timezone})` },
      { label: "Runway Lighting", value: a.runways.length ? `${lit} of ${a.runways.length} runways lit` : "—" },
      { label: "Airport of Entry", value: a.customs ? "Yes" : "No" },
      { label: "FBO / GAT", value: providerLinks(providers, "fbo") },
      { label: "Fuel", value: providerLinks(providers, "fuel") },
      { label: "Fire Category", value: a.fireCategory },
      { label: "Longest Runway", value: longest ? `${longest.designator} · ${formatNumber(longest.lengthFt)} ft` : "—" },
      { label: "Customs and Immigration", value: a.customs ? "Available" : "Not available" },
      { label: "Operating Hours", value: a.operatingHours },
    ],
  };
}

function serviceFields(providers: Provider[]): { fields: InfoField[]; more: InfoField[] } {
  return {
    fields: [
      { label: "FBO / GAT", value: providerLinks(providers, "fbo") },
      { label: "Handling", value: providerLinks(providers, "ground-handler") },
      { label: "Fuel", value: providerLinks(providers, "fuel") },
      { label: "Catering", value: providerLinks(providers, "catering") },
      { label: "Trip Support", value: providerLinks(providers, "trip-support") },
      { label: "Permits", value: providerLinks(providers, "permit") },
      { label: "Supervisory Agent", value: providerLinks(providers, "supervisory-agent") },
      { label: "MRO or Repair Facilities", value: providerLinks(providers, "mro") },
    ],
    more: [
      { label: "Charter Operators", value: providerLinks(providers, "charter-operator") },
      { label: "Charter Brokers", value: providerLinks(providers, "charter-broker") },
      { label: "Transportation", value: providerLinks(providers, "ground-transportation") },
      { label: "Meet and Assist", value: providerLinks(providers, "meet-and-assist") },
    ],
  };
}

/** ICAO Annex 14 RFFS category → aeroplane overall length covered and minimum rescue vehicles. */
function rffsDetails(fireCategory: string) {
  const cat = Number.parseInt(fireCategory.replace(/\D+/g, ""), 10);
  const lengths = ["", "up to 9 m", "9–12 m", "12–18 m", "18–24 m", "24–28 m", "28–39 m", "39–49 m", "49–61 m", "61–76 m", "76–90 m"];
  if (!Number.isFinite(cat) || cat < 1 || cat > 10) return null;
  return { length: lengths[cat], vehicles: cat <= 5 ? 1 : cat <= 7 ? 2 : 3 };
}

export default async function AirportPage({ params, searchParams }: PageProps<"/airports/[code]">) {
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  const airport = await getAirport(code);
  if (!airport) notFound();

  const canonical = airport.icao.toLowerCase();
  if (code !== canonical) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const val of Array.isArray(v) ? v : v ? [v] : []) qs.append(k, val);
    permanentRedirect(`/airports/${canonical}${qs.size ? `?${qs.toString()}` : ""}`);
  }

  const serviceParam = firstParam(sp.service);
  const categories = await listCategories();
  const service = serviceParam === "all" ? "all" : categories.find((c) => c.slug === serviceParam)?.slug;
  const tab = parseTab(firstParam(sp.tab));
  const from = (firstParam(sp.from) ?? "").trim().toUpperCase();
  const to = (firstParam(sp.to) ?? "").trim().toUpperCase();

  const [metar, taf, notams, providers, selectedProviders, nearby, distance, headerAd, sidebarAd] = await Promise.all([
    getMetar(airport.icao),
    getTaf(airport.icao),
    getNotams(airport.icao),
    orFallback(getProvidersAtAirport(airport.icao), []),
    service ? orFallback(getProvidersAtAirport(airport.icao, service === "all" ? undefined : service), []) : Promise.resolve([]),
    tab === "nearby" && !service ? orFallback(getNearbyAirports(airport.icao, NEARBY_RADIUS_KM), null) : Promise.resolve(null),
    from && to ? orFallback(getDistance(from, to), null) : Promise.resolve(null),
    getAdvertisement("header-banner"),
    getAdvertisement("sidebar"),
  ]);

  const counts: Record<string, number> = {};
  for (const p of providers) counts[p.category] = (counts[p.category] ?? 0) + 1;
  const distanceError = from && to && !distance ? `We couldn't find ${from} or ${to}. Enter valid ICAO or IATA codes.` : undefined;
  const serviceName = service === "all" ? "Aviation service" : categories.find((c) => c.slug === service)?.name;

  const calculator = (
    <DistanceCalculator action={`/airports/${canonical}`} tab={tab} from={from || airport.icao} to={to} result={distance} error={distanceError} />
  );

  let content: ReactNode;
  if (service) {
    content = (
      <section aria-labelledby="providers-heading">
        <h2 id="providers-heading" className="px-1 text-lg font-bold text-ink">
          {serviceName} providers at {airport.shortName}{" "}
          <span className="font-medium text-muted">({selectedProviders.length})</span>
        </h2>
        {selectedProviders.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-[20px] bg-white shadow-card">
            {selectedProviders.map((p) => (
              <ProviderRow key={p.slug} provider={p} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-[20px] border border-dashed border-line bg-white px-6 py-12 text-center">
            <p className="text-3xl" aria-hidden>
              🛂
            </p>
            <p className="mt-2 font-bold text-ink">No {serviceName?.toLowerCase()} providers listed at {airport.icao} yet</p>
            <p className="mt-1 text-sm text-muted">Browse the global directory or list your company to reach operators flying here.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href={`/directory?category=${service}`} className="bg-brand-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110">
                Browse directory
              </Link>
              <Link href={airportHref(airport.icao)} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
                Back to airport info
              </Link>
            </div>
          </div>
        )}
      </section>
    );
  } else if (tab === "info") {
    const info = infoFields(airport, providers);
    content = (
      <div className="space-y-6">
        <div className="rounded-[20px] bg-white p-2 shadow-card sm:p-4 md:p-6">
          <InfoGrid fields={info.fields} more={info.more} moreLabel="More Airport Information" />
        </div>
        <WeatherPanels icao={airport.icao} metar={metar} taf={taf} />
      </div>
    );
  } else if (tab === "services") {
    const svc = serviceFields(providers);
    content = (
      <div className="space-y-8">
        <InfoGrid fields={svc.fields} more={svc.more} moreLabel="More Airport Services Information" />
        {calculator}
      </div>
    );
  } else if (tab === "runways") {
    content = <RunwaysPanel runways={airport.runways} />;
  } else if (tab === "communication") {
    content =
      airport.frequencies.length > 0 ? (
        <SimpleRows
          caption="Airport frequencies"
          rows={airport.frequencies.map((f) => ({ key: `${f.type}-${f.mhz}`, label: f.description, meta: f.type, value: <span className="font-mono">{f.mhz} MHz</span> }))}
        />
      ) : (
        <p className="rounded-[20px] bg-white p-6 text-sm text-muted shadow-card">No frequencies are published for this airport.</p>
      );
  } else if (tab === "fire") {
    const rffs = rffsDetails(airport.fireCategory);
    content = (
      <SimpleRows
        caption="Fire and rescue"
        rows={[
          { key: "cat", label: "CATEGORY FOR FIRE", value: airport.fireCategory },
          ...(rffs
            ? [
                { key: "len", label: "AEROPLANE LENGTH COVERED", value: rffs.length, meta: "ICAO Annex 14 aerodrome category" },
                { key: "veh", label: "RESCUE EQUIPMENT", value: `Min. ${rffs.vehicles} RFFS vehicle${rffs.vehicles > 1 ? "s" : ""}`, meta: "ICAO Annex 14 minimum" },
              ]
            : []),
          { key: "hours", label: "OPERATING HOURS", value: airport.operatingHours },
        ]}
      />
    );
  } else {
    content = (
      <div className="space-y-8">
        <NearbyList results={nearby?.results ?? []} radiusKm={NEARBY_RADIUS_KM} />
        {calculator}
      </div>
    );
  }

  return (
    <>
      <AdBanner ad={headerAd} className="pt-4" />
      <AirportHero airport={airport} />

      <div className="container-site grid gap-5 py-8 lg:grid-cols-[minmax(0,1fr)_272px]">
        <div className="min-w-0 space-y-6">
          <ToolTiles icao={airport.icao} flightCategory={metar?.flightCategory ?? "N/A"} notamCount={notams.length} />
          <div className="grid gap-3 md:grid-cols-[248px_minmax(0,1fr)]">
            <div>
              <ServiceSidebar icao={airport.icao} active={service} counts={counts} categories={categories} />
            </div>
            <div id="airport-content" className="min-w-0 scroll-mt-24 space-y-3">
              <AirportTabs icao={airport.icao} active={service ? undefined : tab} />
              {content}
            </div>
          </div>
        </div>
        <aside className="hidden space-y-5 lg:block" aria-label="Advertisements">
          <SkyscraperAd />
          <SidebarAd ad={sidebarAd} />
        </aside>
      </div>

      <AdBanner ad={headerAd} className="pb-8" />
      <div className="container-site">
        <LocationMap lat={airport.lat} lon={airport.lon} name={airport.name} />
      </div>
      <AdBanner ad={headerAd} className="py-10" />
    </>
  );
}
