"use client";

import { siteUrl } from "@/components/admin/news/site";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { FormSection, Grid, Repeater, ChipInput, Toggle, UploadField } from "@/components/admin/providers/form-kit";
import { Card, EmptyState, ErrorPanel, formatDateTime } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input, Select } from "@/components/ui/Field";
import { Flag } from "@/components/ui/Flag";
import { countries, countryName } from "@/lib/countries";
import { ApiError, apiRequest } from "@/lib/api/client";
import { fieldErrors } from "@/lib/api/forms";
import { useApi } from "@/lib/hooks/useApi";
import { DeleteAirportButton } from "./DeleteAirportButton";
import { titleCase } from "@/lib/text";
import { NearbyAirportsInput } from "./NearbyAirportsInput";
import {
  COMM_ROWS,
  CONTINENT_OPTIONS,
  commText,
  commTextError,
  withCommText,
  approachesText,
  timeZones,
  utcOffsetFor,
  shortNameFor,
  AIRPORT_TYPES,
  airportRequestBody,
  airportSchema,
  emptyAirportState,
  rawAirportPayload,
  stateFromAirport,
  type AdminAirport,
  type AirportFormState,
} from "./schema";

type Feedback = { status: "success" | "error"; message: string; inUse?: boolean } | null;

const back = (
  <Link href="/admin/airports" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
    <ArrowLeft className="size-4" /> All airports
  </Link>
);

export function AirportEditor({ icao }: { icao?: string }) {
  const { data, error, reload } = useApi<AdminAirport>(icao ? `/admin/airports/${icao}` : null);
  if (!icao) return <AirportForm initial={null} />;
  if (error && !data) {
    return (
      <>
        {back}
        {error.status === 404 ? <EmptyState title="Airport not found" description={`No airport with ICAO code ${icao}.`} /> : <ErrorPanel error={error} onRetry={reload} />}
      </>
    );
  }
  if (!data) {
    return (
      <>
        {back}
        <div className="h-96 animate-pulse rounded-2xl bg-white/60" role="status" aria-label="Loading airport" />
      </>
    );
  }
  return <AirportForm key={data.icao} initial={data} />;
}

function AirportForm({ initial }: { initial: AdminAirport | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const mode = initial ? "edit" : "create";
  const [airport, setAirport] = useState(initial);
  const [s, setS] = useState<AirportFormState>(() => (initial ? stateFromAirport(initial) : emptyAirportState()));
  // Text typed in the Communication boxes (kept separately so "118.5, " can be typed); frequencies follow it.
  const [comm, setComm] = useState<Record<string, string>>(() => Object.fromEntries(COMM_ROWS.map((row) => [row.key, commText(initial?.frequencies ?? [], row)])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(params.get("created") ? { status: "success", message: "Airport created." } : null);
  const statusRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof AirportFormState>(key: K, value: AirportFormState[K]) => setS((prev) => ({ ...prev, [key]: value }));
  const e = (path: string) => errors[path];
  const show = (fb: Feedback) => {
    setFeedback(fb);
    requestAnimationFrame(() => statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const schema = mode === "create" ? airportSchema.required({ icao: true }) : airportSchema;
    const parsed = schema.safeParse(rawAirportPayload(s, mode));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      show({ status: "error", message: "Please correct the highlighted fields." });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const body = airportRequestBody(parsed.data);
      if (mode === "create") {
        const created = await apiRequest<AdminAirport>("POST", "/admin/airports", body);
        router.replace(`/admin/airports/${created.icao}?created=1`);
        return;
      }
      const updated = await apiRequest<AdminAirport>("PATCH", `/admin/airports/${airport!.icao}`, body);
      setAirport(updated);
      setS(stateFromAirport(updated));
      show({ status: "success", message: "Changes saved." });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body.fieldErrors) setErrors(err.body.fieldErrors);
        show({ status: "error", message: err.body.message });
      } else show({ status: "error", message: "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const errorList = Object.entries(errors);

  return (
    <>
      {back}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink">{airport ? `${airport.icao} · ${airport.shortName}` : "New airport"}</h1>
        {airport && (
          <p className="mt-1 text-sm text-muted">
            {airport.servicesCount} published listing{airport.servicesCount === 1 ? "" : "s"} · updated {formatDateTime(airport.updatedAt)}
          </p>
        )}
      </div>

      <div ref={statusRef} className="mb-4 flex flex-col gap-2 empty:hidden" aria-live="polite">
        {feedback && <FormStatus status={feedback.status} message={feedback.message} />}
        {feedback?.inUse && airport && (
          <Link href={`/admin/providers?q=${airport.icao}`} className="text-sm font-semibold text-brand hover:underline">
            See listings that use {airport.icao} →
          </Link>
        )}
        {errorList.length > 0 && (
          <ul className="list-inside list-disc rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {errorList.slice(0, 8).map(([k, v]) => (
              <li key={k}>
                <span className="font-semibold">{k}</span>: {v}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={submit} noValidate className="grid items-start gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Same fields and order as "Airport Information" on the airport page (main rows, then "More Airport Information"). */}
          <FormSection title="Airport Information">
            <Grid>
              {/* The short name used on cards is derived from this (minus a trailing "Airport"). */}
              <Input
                label="Airport Name *"
                name="name"
                value={s.name}
                maxLength={150}
                onChange={(ev) => setS((prev) => ({ ...prev, name: ev.target.value, shortName: shortNameFor(ev.target.value) }))}
                error={e("name") ?? e("shortName")}
              />
              <Input
                label="ICAO Code *"
                name="icao"
                value={s.icao}
                maxLength={4}
                disabled={mode === "edit"}
                onChange={(ev) => set("icao", ev.target.value.toUpperCase())}
                error={e("icao")}
                hint={mode === "edit" ? "The ICAO code can't be changed." : undefined}
                className="font-mono"
              />
              <Input label="IATA Code" name="iata" value={s.iata} maxLength={3} onChange={(ev) => set("iata", ev.target.value.toUpperCase())} error={e("iata")} className="font-mono" />
              <Input label="City Name *" name="city" value={s.city} maxLength={80} onChange={(ev) => set("city", ev.target.value)} onBlur={() => set("city", titleCase(s.city))} error={e("city")} />
              <Input label="Country Name *" name="country" value={s.country} maxLength={80} onChange={(ev) => set("country", ev.target.value)} onBlur={() => set("country", titleCase(s.country))} error={e("country")} />
              <div>
                <Select
                  label="Country Flag *"
                  name="countryCode"
                  value={s.countryCode}
                  onChange={(ev) => {
                    const code = ev.target.value;
                    // Fill the country name when it's empty or still the previous flag's name.
                    setS((prev) => ({ ...prev, countryCode: code, country: !prev.country.trim() || prev.country === countryName(prev.countryCode) ? (code ? countryName(code) : "") : prev.country }));
                  }}
                  error={e("countryCode")}
                >
                  <option value="">Choose a country</option>
                  {/* A saved code missing from the list stays selectable. */}
                  {s.countryCode && !countries().some((c) => c.code === s.countryCode) && <option value={s.countryCode}>{s.countryCode}</option>}
                  {countries().map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </Select>
                {s.countryCode && !e("countryCode") && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-subtle">
                    <Flag code={s.countryCode} /> {countryName(s.countryCode)}
                  </p>
                )}
              </div>
              <Select label="Airport Type *" name="type" value={s.type} onChange={(ev) => set("type", ev.target.value as AirportFormState["type"])} error={e("type")}>
                {AIRPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Input label="Latitude *" name="lat" type="number" step="any" min={-90} max={90} value={s.lat} onChange={(ev) => set("lat", ev.target.value)} error={e("lat")} hint="Decimal degrees, N positive" />
              <div>
                <Input label="Longitude *" name="lon" type="number" step="any" min={-180} max={180} value={s.lon} onChange={(ev) => set("lon", ev.target.value)} error={e("lon")} hint="Decimal degrees, E positive" />
                {s.lat && s.lon && !e("lat") && !e("lon") && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(s.lat)}&mlon=${encodeURIComponent(s.lon)}#map=13/${encodeURIComponent(s.lat)}/${encodeURIComponent(s.lon)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    Check position on OpenStreetMap <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <Select label="Continent *" name="continent" value={s.continent} onChange={(ev) => set("continent", ev.target.value)} error={e("continent")}>
                <option value="">Choose…</option>
                {/* Stored values stay the API's continents ("Oceania" is shown as Australia); one outside this list, e.g. Antarctica, stays selectable. */}
                {s.continent && !CONTINENT_OPTIONS.some((o) => o.value === s.continent) && <option value={s.continent}>{s.continent}</option>}
                {CONTINENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Input label="Type of Traffic Permitted" name="trafficPermitted" value={s.trafficPermitted} maxLength={80} placeholder="IFR / VFR" onChange={(ev) => set("trafficPermitted", ev.target.value)} error={e("trafficPermitted")} />
              <Input label="Approaches" name="approaches" value={approachesText(s.runways.map((r) => r.ils))} disabled readOnly hint="Filled automatically from the runways' saved ILS data." />
              <Input label="Elevation (ft)" name="elevationFt" type="number" step={1} value={s.elevationFt} onChange={(ev) => set("elevationFt", ev.target.value)} error={e("elevationFt")} />
              <Select
                label="UTC (Timezone)"
                name="timezone"
                value={s.timezone}
                onChange={(ev) => setS((prev) => ({ ...prev, timezone: ev.target.value, utcOffset: utcOffsetFor(ev.target.value) }))}
                error={e("timezone") ?? e("utcOffset")}
              >
                {/* A saved zone missing from this browser's list stays selectable. */}
                {s.timezone && !timeZones().some((z) => z.zone === s.timezone) && <option value={s.timezone}>{`${s.timezone} (${s.utcOffset || "UTC"})`}</option>}
                {timeZones().map((z) => (
                  <option key={z.zone} value={z.zone}>
                    {`${z.zone} (${z.offset})`}
                  </option>
                ))}
              </Select>
              <Input
                label="Airport Light Intensity"
                name="lightIntensity"
                value={s.lightIntensity}
                maxLength={80}
                placeholder="High (HIRL)"
                onChange={(ev) => set("lightIntensity", ev.target.value)}
                error={e("lightIntensity")}
                hint="Left blank, the site shows how many runways are lit."
              />
              <Select label="Airport of Entry" name="customs" value={s.customs ? "yes" : "no"} onChange={(ev) => set("customs", ev.target.value === "yes")}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
              <Input label="Fire Category" name="fireCategory" value={s.fireCategory} maxLength={20} placeholder="CAT 9" onChange={(ev) => set("fireCategory", ev.target.value)} error={e("fireCategory")} />
              <div>
                <Select label="Customs and Immigration" name="customsImmigration" value={s.customs ? "yes" : "no"} onChange={(ev) => set("customs", ev.target.value === "yes")}>
                  <option value="yes">Available</option>
                  <option value="no">Not available</option>
                </Select>
                <p className="mt-1.5 text-xs text-subtle">Same setting as Airport of Entry: changing one changes the other.</p>
              </div>
              <Input label="Airport Category" name="airportCategory" value={s.airportCategory} maxLength={80} placeholder="International" onChange={(ev) => set("airportCategory", ev.target.value)} error={e("airportCategory")} />
              <Input label="Slots Required" name="slotsRequired" value={s.slotsRequired} maxLength={80} placeholder="Yes — coordinated (Level 3)" onChange={(ev) => set("slotsRequired", ev.target.value)} error={e("slotsRequired")} />
            </Grid>
          </FormSection>

          {/* Same rows and order as the airport page's "Airport Services" tab; blank fields show as "—". */}
          <FormSection title="Airport Services">
            <Grid>
              <Input label="Handling" name="handlingAuto" value="Automatic: ground handler listings at this airport" disabled readOnly hint="Add a ground handler listing with this airport to show it here." />
              <Input label="Cargo-Handling Facilities" name="cargoHandling" value={s.cargoHandling} maxLength={120} placeholder="Cargo terminal with customs clearance" onChange={(ev) => set("cargoHandling", ev.target.value)} error={e("cargoHandling")} />
              <Input label="Catering" name="cateringAuto" value="Automatic: catering listings at this airport" disabled readOnly hint="Add a catering listing with this airport to show it here." />
              <Input label="De-icing Facilities" name="deicing" value={s.deicing} maxLength={80} placeholder="Available" onChange={(ev) => set("deicing", ev.target.value)} error={e("deicing")} />
              <Input label="Hangar Space for Visiting Aircraft" name="hangarSpace" value={s.hangarSpace} maxLength={120} placeholder="Available on request" onChange={(ev) => set("hangarSpace", ev.target.value)} error={e("hangarSpace")} />
              <Input label="MRO or Repair Facilities for Visiting Aircraft" name="mroAuto" value="Automatic: MRO listings at this airport" disabled readOnly hint="Add a MRO listing with this airport to show it here." />
              <Input label="Transit Hotel at the Airport" name="hotelAuto" value="Automatic: hotel listings at this airport" disabled readOnly hint="Add a hotel listing with this airport to show it here." />
              <Input label="Restaurants" name="restaurants" value={s.restaurants} maxLength={120} placeholder="Landside and airside" onChange={(ev) => set("restaurants", ev.target.value)} error={e("restaurants")} />
              <Input label="Transportation" name="transportAuto" value="Automatic: ground transportation listings at this airport" disabled readOnly hint="Add a ground transportation listing with this airport to show it here." />
              <Input label="Medical Facilities" name="medicalFacilities" value={s.medicalFacilities} maxLength={120} placeholder="Airport medical centre" onChange={(ev) => set("medicalFacilities", ev.target.value)} error={e("medicalFacilities")} />
            </Grid>
          </FormSection>

          <FormSection title="Runways">
            <UploadField
              id="runwayDiagram"
              label="Runway diagram"
              kind="image"
              value={s.runwayDiagram}
              onChange={(v) => set("runwayDiagram", v)}
              error={e("runwayDiagram")}
              hint="Airport chart shown on the Runways tab. Landscape, about 1614×978 px. Without one, a simple drawing is made from the runways below."
            />
            <Repeater
              items={s.runways}
              onChange={(v) => set("runways", v)}
              create={() => ({ designator: "", lengthFt: "", widthFt: "", surface: "Asphalt", lighting: true, headingDeg: "", ils: "", pcn: "", coordinates: "", elevation: "", displacedThreshold: "" })}
              max={20}
              addLabel="Add runway"
              itemLabel={(r, i) => (r.designator ? `Runway ${r.designator}` : `Runway ${i + 1}`)}
              errorId="runways-error"
              error={e("runways")}
            >
              {(r, i, update) => {
                const p = `runways.${i}`;
                return (
                  <div className="flex flex-col gap-3">
                    <Grid>
                      <Input label="Designator *" name={`${p}.designator`} value={r.designator} maxLength={20} placeholder="09/27" onChange={(ev) => update({ designator: ev.target.value })} error={e(`${p}.designator`)} />
                      <Input label="Surface *" name={`${p}.surface`} value={r.surface} maxLength={40} onChange={(ev) => update({ surface: ev.target.value })} error={e(`${p}.surface`)} />
                    </Grid>
                    <Grid cols={3}>
                      <Input label="Length (ft) *" name={`${p}.lengthFt`} type="number" min={0} max={30000} value={r.lengthFt} onChange={(ev) => update({ lengthFt: ev.target.value })} error={e(`${p}.lengthFt`)} />
                      <Input label="Width (ft) *" name={`${p}.widthFt`} type="number" min={0} max={1000} value={r.widthFt} onChange={(ev) => update({ widthFt: ev.target.value })} error={e(`${p}.widthFt`)} />
                      <Input label="Heading (°) *" name={`${p}.headingDeg`} type="number" step="any" min={0} max={360} value={r.headingDeg} onChange={(ev) => update({ headingDeg: ev.target.value })} error={e(`${p}.headingDeg`)} />
                    </Grid>
                    {/* Shown when the runway row is expanded on the airport page; blank fields show as "—". */}
                    <Grid cols={2}>
                      <Input label="PCN" name={`${p}.pcn`} value={r.pcn} maxLength={40} placeholder="80/F/A/W/T" onChange={(ev) => update({ pcn: ev.target.value })} error={e(`${p}.pcn`)} />
                      <Input label="Coordinates" name={`${p}.coordinates`} value={r.coordinates} maxLength={80} placeholder="N51 28.6 W000 29.1" onChange={(ev) => update({ coordinates: ev.target.value })} error={e(`${p}.coordinates`)} />
                    </Grid>
                    <Grid cols={2}>
                      <Input label="Elevation" name={`${p}.elevation`} value={r.elevation} maxLength={40} placeholder="79 ft" onChange={(ev) => update({ elevation: ev.target.value })} error={e(`${p}.elevation`)} />
                      <Input label="Displaced threshold" name={`${p}.displacedThreshold`} value={r.displacedThreshold} maxLength={40} placeholder="1,007 ft" onChange={(ev) => update({ displacedThreshold: ev.target.value })} error={e(`${p}.displacedThreshold`)} />
                    </Grid>
                  </div>
                );
              }}
            </Repeater>
          </FormSection>

          {/* Same rows and order as the airport page's "Airport Communication" tab; blank rows show as "—". */}
          <FormSection title="Airport Communication">
            <Grid>
              {COMM_ROWS.map((row) => (
                <Input
                  key={row.key}
                  label={`${row.label} (MHz)`}
                  name={`comm-${row.key}`}
                  value={comm[row.key] ?? ""}
                  inputMode="decimal"
                  placeholder="118.505"
                  onChange={(ev) => {
                    const text = ev.target.value;
                    setComm((c) => ({ ...c, [row.key]: text }));
                    setS((prev) => ({ ...prev, frequencies: withCommText(prev.frequencies, row, text) }));
                  }}
                  error={commTextError(comm[row.key] ?? "")}
                />
              ))}
            </Grid>
            <p className="text-xs text-subtle">For more than one frequency, separate them with commas: 118.505, 118.700.</p>
          </FormSection>

          {/* Same rows and order as the airport page's "Fire/RFFS" tab; blank fields show as "—". */}
          <FormSection title="Fire/RFFS">
            <Grid>
              <Input
                label="Category for Fire"
                name="fireCategoryRffs"
                value={s.fireCategory}
                maxLength={20}
                placeholder="CAT 9"
                onChange={(ev) => set("fireCategory", ev.target.value)}
                error={e("fireCategory")}
                hint="Same as Fire Category in Airport Information: changing one changes the other."
              />
              <Input
                label="Rescue Equipment"
                name="rescueEquipment"
                value={s.rescueEquipment}
                maxLength={120}
                placeholder="Min. 3 RFFS vehicles"
                onChange={(ev) => set("rescueEquipment", ev.target.value)}
                error={e("rescueEquipment")}
                hint="Left blank, the site shows the minimum vehicles for the fire category."
              />
              <Input
                label="Capability for Removal of Disabled Aircraft"
                name="disabledAircraftRemoval"
                value={s.disabledAircraftRemoval}
                maxLength={120}
                placeholder="Up to B747 (recovery kit on site)"
                onChange={(ev) => set("disabledAircraftRemoval", ev.target.value)}
                error={e("disabledAircraftRemoval")}
              />
            </Grid>
          </FormSection>

          {/* The airport page's "Nearby Airport" tab. */}
          <FormSection title="Nearby Airports">
            <NearbyAirportsInput icao={s.icao} value={s.nearbyAirports} onChange={(v) => set("nearbyAirports", v)} error={e("nearbyAirports")} />
          </FormSection>

          <FormSection title="Other Details">
            <Grid>
              <Input label="Operating hours" name="operatingHours" value={s.operatingHours} maxLength={120} placeholder="24/7" onChange={(ev) => set("operatingHours", ev.target.value)} error={e("operatingHours")} />
              <Input label="Region" name="region" value={s.region} maxLength={120} onChange={(ev) => set("region", ev.target.value)} onBlur={() => set("region", titleCase(s.region))} error={e("region")} />
            </Grid>
            <ChipInput id="serviceTags" label="Service tags" values={s.serviceTags} onChange={(v) => set("serviceTags", v)} max={20} maxLength={30} placeholder="FBO, Fuel, Customs…" error={e("serviceTags")} />
            <UploadField id="image" label="Image" kind="image" value={s.image} onChange={(v) => set("image", v)} error={e("image")} />
          </FormSection>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24">
          <Card title="Visibility">
            <div className="flex flex-col gap-3">
              <Toggle id="featured" label="Featured" description="Shown in featured airport lists on the site." checked={s.featured} onChange={(v) => set("featured", v)} />
            </div>
          </Card>
          <div className="flex flex-col gap-3 glass rounded-2xl border p-4">
            <Button type="submit" loading={saving} className="w-full">
              {mode === "create" ? "Create airport" : "Save changes"}
            </Button>
            {airport && (
              <>
                <a href={siteUrl(`/airports/${airport.icao.toLowerCase()}`)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-brand hover:underline">
                  View public page <ExternalLink className="size-3.5" />
                </a>
                <div className="border-t border-line pt-3">
                  <DeleteAirportButton
                    icao={airport.icao}
                    onDeleted={() => router.push("/admin/airports")}
                    onError={(message, inUse) => show({ status: "error", message, inUse })}
                  />
                </div>
              </>
            )}
          </div>
        </aside>
      </form>
    </>
  );
}
