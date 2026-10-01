import { Flag } from "@/components/ui/Flag";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AdBanner } from "@/components/ads/AdBanner";
import { AirportHero } from "@/components/airport/AirportHero";
import { AirportTabs } from "@/components/airport/AirportTabs";
import { DistanceCalculator } from "@/components/airport/DistanceCalculator";
import { InfoGrid, type InfoField } from "@/components/airport/InfoGrid";
import { LocationMap } from "@/components/airport/LocationMap";
import { NearbyList } from "@/components/airport/NearbyList";
import { Pagination } from "@/components/ui/Pagination";
import { ProviderRow } from "@/components/airport/ProviderRow";
import { AIRPORT_TYPE_LABEL, airportHref, parseTab, type AirportTab } from "@/components/airport/routes";
import { RunwaysPanel } from "@/components/airport/RunwaysPanel";
import { ServiceSidebar } from "@/components/airport/ServiceSidebar";
import { SimpleRows } from "@/components/airport/SimpleRows";
import { SkyscraperAd } from "@/components/airport/SkyscraperAd";
import { ToolTiles } from "@/components/tools/ToolTiles";
import { getAirport, getDistance, getNearbyAirports } from "@/lib/data/airports";
import { listCategories } from "@/lib/data/categories";
import { getAdvertisement } from "@/lib/data/content";
import { getProvidersAtAirport } from "@/lib/data/providers";
import { orFallback } from "@/lib/data/safe";
import { getNotams } from "@/lib/integrations/notams";
import { getMetar } from "@/lib/integrations/weather";
import type { Airport, Provider, ServiceCategorySlug } from "@/lib/types";
import { cn, firstParam, formatNumber } from "@/lib/utils";

const NEARBY_RADIUS_KM = 250;
/** Basic-tier listings per page on the provider list (Figma 1021:3977 draws five). */
const BASIC_PAGE_SIZE = 5;

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
    // Rows and order follow Figma 696:1642. Details staff have not filled in yet show a dash.
    more: [
      { label: "Type of Traffic Permitted", value: a.trafficPermitted || "—" },
      { label: "Approaches", value: ils.length ? `ILS ${ils.join(", ")}` : "Visual / non-precision" },
      { label: "Elevation (ft)", value: `${formatNumber(a.elevationFt)} ft (${formatNumber(Math.round(a.elevationFt * 0.3048))} m)` },
      { label: "UTC", value: `${a.utcOffset} (${a.timezone})` },
      { label: "Airport Light Intensity", value: a.lightIntensity || (a.runways.length ? `${lit} of ${a.runways.length} runways lit` : "—") },
      { label: "Airport of Entry", value: a.customs ? "Yes" : "No" },
      { label: "FBO/ GAT", value: providerLinks(providers, "fbo") },
      { label: "Fuel", value: providerLinks(providers, "fuel") },
      { label: "Fire Category", value: a.fireCategory || "—" },
      { label: "Deicing", value: a.deicing || "—" },
      { label: "Customs and Immigration", value: a.customs ? "Available" : "Not available" },
      { label: "Airport Category", value: a.airportCategory || "—" },
      { label: "Slots Required", value: a.slotsRequired || "—" },
      {
        label: "Airport Website",
        value: a.website ? (
          <a href={a.website} target="_blank" rel="noopener noreferrer" className="break-all text-brand hover:underline">
            {a.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
          </a>
        ) : (
          "—"
        ),
      },
    ],
  };
}

/** "Airport Services" tab rows (Figma 752:7545). Facilities staff have not filled in yet show a dash. */
function serviceFields(a: Airport, providers: Provider[]): { fields: InfoField[]; more: InfoField[] } {
  return {
    fields: [
      { label: "FBO/GAT", value: providerLinks(providers, "fbo") },
      { label: "Handling", value: providerLinks(providers, "ground-handler") },
      { label: "Cargo-Handling Facilities", value: a.cargoHandling || "—" },
      { label: "Fuel", value: providerLinks(providers, "fuel") },
      { label: "Catering", value: providerLinks(providers, "catering") },
      { label: "De-icing Facilities", value: a.deicing || "—" },
      { label: "Hangar Space for Visiting Aircraft", value: a.hangarSpace || "—" },
      { label: "MRO or Repair Facilities for Visiting Aircraft", value: providerLinks(providers, "mro") },
    ],
    more: [
      { label: "Transit Hotel at the Airport", value: providerLinks(providers, "hotels") },
      { label: "Restaurants", value: a.restaurants || "—" },
      { label: "Transportation", value: providerLinks(providers, "ground-transportation") },
      { label: "Medical Facilities", value: a.medicalFacilities || "—" },
    ],
  };
}

/** Rows of the Airport Communication tab, in the design's order (Figma 949:5566), with the frequency types that feed each. */
const FREQUENCY_ROWS: [label: string, types: string[]][] = [
  ["Approach Frequency", ["APP", "APCH"]],
  ["Arrival Frequency", ["ARR"]],
  ["Departure Frequency", ["DEP"]],
  ["Clearance Delivery Frequency", ["DEL", "CLD", "CLR", "CLNC"]],
  ["Ground Frequency", ["GND"]],
  ["Tower Frequency", ["TWR"]],
  ["ATIS", ["ATIS"]],
];

function frequencyRows(frequencies: Airport["frequencies"]) {
  const mhz = (list: Airport["frequencies"]) => (list.length ? `${list.map((f) => f.mhz).join(", ")} MHz` : "—");
  const known = new Set(FREQUENCY_ROWS.flatMap(([, types]) => types));
  return [
    ...FREQUENCY_ROWS.map(([label, types]) => ({ key: label, label, value: mhz(frequencies.filter((f) => types.includes(f.type.toUpperCase()))) })),
    // Anything else staff have published (e.g. UNICOM) follows under its own name.
    ...frequencies.filter((f) => !known.has(f.type.toUpperCase())).map((f) => ({ key: `${f.type}-${f.mhz}`, label: f.description, value: `${f.mhz} MHz` })),
  ];
}

/** Right-rail ad heights per tab (Figma 696:1642, 752:7218, 960:469, 713:11343, 713:12052, 908:1355). */
const SIDE_ADS: Record<AirportTab, string[]> = {
  info: ["h-[688px]"],
  services: ["h-[812px]"],
  runways: ["h-[592px]", "h-[592px]"],
  communication: ["h-[592px]", "h-[442px]"],
  fire: ["h-[592px]", "h-[442px]"],
  nearby: ["h-[624px]"],
};
/** Space between the main grid and the bottom banner. */
const BOTTOM_PAD: Record<AirportTab, string> = {
  info: "pb-8",
  services: "pb-6",
  runways: "pb-8 lg:pb-[62px]",
  communication: "pb-10",
  fire: "pb-10",
  nearby: "pb-8 lg:pb-[34px]",
};

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

  const [metar, notams, providers, selectedProviders, nearby, distance, headerAd] = await Promise.all([
    getMetar(airport.icao),
    getNotams(airport.icao),
    orFallback(getProvidersAtAirport(airport.icao), []),
    service ? orFallback(getProvidersAtAirport(airport.icao, service === "all" ? undefined : service), []) : Promise.resolve([]),
    tab === "nearby" && !service ? orFallback(getNearbyAirports(airport.icao, NEARBY_RADIUS_KM), null) : Promise.resolve(null),
    from && to ? orFallback(getDistance(from, to), null) : Promise.resolve(null),
    getAdvertisement("header-banner"),
  ]);

  const distanceError = from && to && !distance ? `We couldn't find ${from} or ${to}. Enter valid ICAO or IATA codes.` : undefined;
  const serviceName = service === "all" ? "Aviation service" : categories.find((c) => c.slug === service)?.name;

  // Services and Nearby tabs end with the distance calculator, which spans the content and ad columns (Figma 752:7836).
  const showCalculator = !service && (tab === "services" || tab === "nearby");

  // Provider list (?service=), Figma 752:9750: Ultra Pro and Pro listings first, then the Basic ones, paged.
  const TIER_ORDER = { ultra_pro: 0, pro: 1, basic: 2 } as const;
  const premiumProviders = selectedProviders.filter((p) => p.tier !== "basic").sort((x, y) => TIER_ORDER[x.tier] - TIER_ORDER[y.tier]);
  const basicProviders = selectedProviders.filter((p) => p.tier === "basic");
  const basicPages = Math.max(1, Math.ceil(basicProviders.length / BASIC_PAGE_SIZE));
  const page = Math.min(basicPages, Math.max(1, Number.parseInt(firstParam(sp.page) ?? "1", 10) || 1));
  const basicOnPage = basicProviders.slice((page - 1) * BASIC_PAGE_SIZE, page * BASIC_PAGE_SIZE);
  const basicList = basicOnPage.length > 0 && (
    <div className="space-y-[5px]">
      {basicOnPage.map((p) => (
        <ProviderRow key={p.slug} provider={p} />
      ))}
    </div>
  );
  // With premium listings the Basic ones get their own section under the middle banner.
  const basicBelow = premiumProviders.length > 0 && basicOnPage.length > 0;

  let content: ReactNode;
  if (service) {
    // The list starts 24px below the tab bar.
    content = (
      <section aria-labelledby="providers-heading" className="lg:pt-3">
        <h2 id="providers-heading" className="sr-only">
          {serviceName} providers at {airport.shortName} ({selectedProviders.length})
        </h2>
        {premiumProviders.length > 0 ? (
          <div className="space-y-[5px]">
            {premiumProviders.map((p) => (
              <ProviderRow key={p.slug} provider={p} />
            ))}
          </div>
        ) : basicList ? (
          basicList
        ) : (
          <div className="rounded-[20px] border border-dashed border-line bg-white px-6 py-12 text-center">
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
    // Figma 696:1642: the row cards sit inside one white card (808px wide; 24px left, 15px right padding).
    content = (
      <div className="rounded-[20px] bg-white p-2 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] sm:p-4 lg:pt-[34px] lg:pr-[15px] lg:pb-8 lg:pl-6">
        <InfoGrid fields={info.fields} more={info.more} moreLabel="More Airport Information" />
      </div>
    );
  } else if (tab === "services") {
    const svc = serviceFields(airport, providers);
    // Figma 752:7545: rows sit directly under the tab bar (no card), 22px below it.
    content = (
      <div className="lg:pt-2.5">
        <InfoGrid fields={svc.fields} more={svc.more} moreLabel="More Airport Services Information" openBar="square" />
      </div>
    );
  } else if (tab === "runways") {
    // Figma 960:966: the list starts 16px below the tab bar.
    content = (
      <div className="lg:pt-1">
        <RunwaysPanel runways={airport.runways} diagram={airport.runwayDiagram} airportName={airport.name} />
      </div>
    );
  } else if (tab === "communication") {
    // Figma 949:5566: the list starts 24px below the tab bar.
    content = (
      <div className="lg:pt-3">
        <SimpleRows caption="Airport frequencies" rows={frequencyRows(airport.frequencies)} />
      </div>
    );
  } else if (tab === "fire") {
    const rffs = rffsDetails(airport.fireCategory);
    // Figma 949:1022 (rows, 22px below the tab bar) followed by two in-column banners.
    content = (
      <div className="lg:pt-2.5">
        <SimpleRows
          caption="Fire and rescue"
          rows={[
            { key: "cat", label: "CATEGORY FOR FIRE", value: airport.fireCategory || "—" },
            {
              key: "equipment",
              label: "RESCUE EQUIPMENT’S",
              value: airport.rescueEquipment || (rffs ? `Min. ${rffs.vehicles} RFFS vehicle${rffs.vehicles > 1 ? "s" : ""}` : "—"),
            },
            { key: "removal", label: "CAPABILITY FOR REMOVAL OF DISABLED AIRCRAFT", value: airport.disabledAircraftRemoval || "—" },
          ]}
        />
        <AdBanner bare ad={headerAd} className="mt-[23px]" height="h-[150px] sm:h-[230px]" />
        <AdBanner bare ad={headerAd} className="mt-7" height="h-[150px] sm:h-[230px]" />
      </div>
    );
  } else {
    content = <NearbyList results={nearby?.results ?? []} radiusKm={NEARBY_RADIUS_KM} />;
  }

  // Page furniture per tab, as drawn in each tab's Figma frame.
  const view: AirportTab | "providers" = service ? "providers" : tab;
  const providersLayout = view === "providers";
  const nearbyLayout = view === "nearby";

  // Provider list: the side ads fill the height of the list (Figma 752:10052 right, 752:10063 under the rail),
  // so their number follows an estimate of that height — roughly one ad per 650px, as drawn.
  const adsFor = (height: number) => Math.max(1, Math.round(height / 650));
  const extraLines = (p: Provider) => (p.contact.fax ? 27 : 0) + (p.contact.phone2 ? 29 : 0) + (p.contact.email2 ? 31 : 0) + (p.contact.sita ? 27 : 0);
  const topListHeight = premiumProviders.length
    ? premiumProviders.reduce((h, p) => h + (p.tier === "ultra_pro" ? 360 : 301) + extraLines(p), 0)
    : basicOnPage.length * 235;
  const railHeight = 40 + (categories.length + 1) * 54;
  const underRail = 70 + topListHeight - railHeight - 21;
  const adsUnderRail = underRail >= 400 ? adsFor(underRail) : 0;
  const topRightAds = adsFor(195 + Math.max(70 + topListHeight, railHeight));
  // A one-row list is too short for a side ad to read.
  const lowerAds = basicOnPage.length >= 2 ? adsFor(basicOnPage.length * 235) : 0;
  const fillAd = "h-auto min-h-[400px] flex-1";

  // Without page links the lower list still keeps clear of the bottom banner.
  const pagination = !providersLayout ? null : basicPages > 1 ? (
    <Pagination page={page} totalPages={basicPages} basePath={`/airports/${canonical}`} params={{ service }} className="container-site pt-6 pb-[22px]" />
  ) : basicBelow ? (
    <div className="h-10" aria-hidden />
  ) : null;

  return (
    <>
      <AdBanner ad={headerAd} className="pt-4" />
      <AirportHero airport={airport} />

      {/*
        Columns (md+): service rail 248 · 12 · content · (lg+) 20 · ad 272. The calculator's row (and,
        on the Nearby tab, a banner row above it) spans content + ad; the rail spans those rows too.
      */}
      <div
        className={cn(
          "container-site grid gap-y-6 pt-8 md:grid-cols-[248px_12px_minmax(0,1fr)] lg:grid-cols-[248px_12px_minmax(0,1fr)_20px_272px]",
          // Fixed 171px tiles row on desktop so the tall ad (rows 1–2) only stretches row 2; with the
          // calculator, the flexible last row absorbs a long opened rail instead of pushing the calculator down.
          nearbyLayout
            ? "md:grid-rows-[auto_auto_auto_1fr] lg:grid-rows-[171px_auto_auto_1fr]"
            : showCalculator
              ? "md:grid-rows-[auto_auto_1fr] lg:grid-rows-[171px_auto_1fr]"
              : "lg:grid-rows-[171px_auto]",
          providersLayout ? "pb-7" : BOTTOM_PAD[view],
        )}
      >
        <div className="min-w-0 md:col-span-3">
          <ToolTiles icao={airport.icao} flightCategory={metar?.flightCategory ?? "N/A"} notamCount={notams.length} />
        </div>
        <div
          className={cn(
            "min-w-0 md:col-start-1 md:row-start-2",
            nearbyLayout ? "md:row-span-3" : showCalculator && "md:row-span-2",
            providersLayout && "flex flex-col gap-[21px]",
          )}
        >
          <ServiceSidebar icao={airport.icao} active={service} categories={categories} />
          {providersLayout && Array.from({ length: adsUnderRail }, (_, i) => <SkyscraperAd key={i} className={cn(fillAd, "hidden lg:block")} />)}
        </div>
        <div id="airport-content" className={cn("min-w-0 scroll-mt-24 space-y-3 md:col-start-3 md:row-start-2", nearbyLayout && "lg:-mb-[11px]")}>
          <AirportTabs icao={airport.icao} active={service ? undefined : tab} />
          {content}
        </div>
        {/* Nearby tab (Figma 908:1714): a 230px banner across content + ad, 13px under the list and 34px under the side ad. */}
        {nearbyLayout && <AdBanner bare ad={headerAd} className="min-w-0 md:col-start-3 md:row-start-3 lg:col-end-6" height="h-[150px] sm:h-[230px]" />}
        {showCalculator && (
          <DistanceCalculator
            action={`/airports/${canonical}`}
            tab={tab}
            from={from || airport.icao}
            to={to}
            result={distance}
            error={distanceError}
            tight={nearbyLayout}
            className={cn("min-w-0 md:col-start-3 lg:col-end-6", nearbyLayout ? "md:row-start-4 lg:mt-1" : "md:row-start-3 lg:mt-[69px]")}
          />
        )}
        <aside className={cn("hidden lg:col-start-5 lg:row-span-2 lg:row-start-1 lg:block", nearbyLayout && "lg:pb-2.5")} aria-label="Advertisement">
          {providersLayout ? (
            <div className="flex h-full flex-col gap-6">
              {Array.from({ length: topRightAds }, (_, i) => (
                <SkyscraperAd key={i} className={fillAd} />
              ))}
            </div>
          ) : (
            <div className="space-y-[23px]">
              {SIDE_ADS[view].map((height, i) => (
                <SkyscraperAd key={i} className={height} />
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Only the Airport Information frame has the middle banner and the map. */}
      {view === "info" && (
        <>
          <AdBanner ad={headerAd} className="pb-8" height="h-[150px] sm:h-[189px]" />
          <div className="container-site">
            <LocationMap lat={airport.lat} lon={airport.lon} name={airport.name} />
          </div>
        </>
      )}

      {/* Provider list, lower half (Figma 1021:3977): banner, then the Basic listings between two ad columns. */}
      {basicBelow && (
        <>
          <AdBanner ad={headerAd} className="pb-8 lg:pb-[45px]" height="h-[150px] sm:h-[222px]" />
          <div className="container-site grid md:grid-cols-[248px_12px_minmax(0,1fr)] lg:grid-cols-[248px_12px_minmax(0,1fr)_20px_272px]">
            {[1, 5].map((col) => (
              <aside key={col} className={cn("hidden flex-col gap-[35px] lg:flex", col === 1 ? "lg:col-start-1" : "lg:col-start-5")} aria-label="Advertisement">
                {Array.from({ length: lowerAds }, (_, i) => (
                  <SkyscraperAd key={i} className="h-auto min-h-[230px] flex-1" />
                ))}
              </aside>
            ))}
            <section aria-label={`More ${serviceName?.toLowerCase()} providers`} className="min-w-0 md:col-span-3 lg:col-span-1 lg:col-start-3 lg:row-start-1">
              {basicList}
            </section>
          </div>
        </>
      )}
      {pagination}
      <AdBanner ad={headerAd} className={view === "info" ? "py-10" : "pb-10"} height="h-[150px] sm:h-[222px]" />
    </>
  );
}
