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
import { ApiError, apiRequest } from "@/lib/api/client";
import { fieldErrors } from "@/lib/api/forms";
import { useApi } from "@/lib/hooks/useApi";
import { DeleteAirportButton } from "./DeleteAirportButton";
import {
  AIRPORT_TYPES,
  airportRequestBody,
  airportSchema,
  CONTINENTS,
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
        <div className="h-96 animate-pulse rounded-2xl bg-white" role="status" aria-label="Loading airport" />
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
          <FormSection title="Identity">
            <Grid cols={4}>
              <Input
                label="ICAO *"
                name="icao"
                value={s.icao}
                maxLength={4}
                disabled={mode === "edit"}
                onChange={(ev) => set("icao", ev.target.value.toUpperCase())}
                error={e("icao")}
                hint={mode === "edit" ? "The ICAO code can't be changed." : undefined}
                className="font-mono"
              />
              <Input label="IATA" name="iata" value={s.iata} maxLength={3} onChange={(ev) => set("iata", ev.target.value.toUpperCase())} error={e("iata")} className="font-mono" />
              <Select label="Type *" name="type" value={s.type} onChange={(ev) => set("type", ev.target.value as AirportFormState["type"])} error={e("type")} wrapperClassName="sm:col-span-2">
                {AIRPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Grid>
            <Grid>
              <Input label="Full name *" name="name" value={s.name} maxLength={150} onChange={(ev) => set("name", ev.target.value)} error={e("name")} />
              <Input label="Short name *" name="shortName" value={s.shortName} maxLength={80} onChange={(ev) => set("shortName", ev.target.value)} error={e("shortName")} />
            </Grid>
          </FormSection>

          <FormSection title="Location">
            <Grid>
              <Input label="City *" name="city" value={s.city} maxLength={80} onChange={(ev) => set("city", ev.target.value)} error={e("city")} />
              <Input label="Region" name="region" value={s.region} maxLength={120} onChange={(ev) => set("region", ev.target.value)} error={e("region")} />
            </Grid>
            <Grid cols={3}>
              <Input label="Country *" name="country" value={s.country} maxLength={80} onChange={(ev) => set("country", ev.target.value)} error={e("country")} />
              <Input label="Country code *" name="countryCode" value={s.countryCode} maxLength={2} placeholder="IN" onChange={(ev) => set("countryCode", ev.target.value.toUpperCase())} error={e("countryCode")} />
              <Select label="Continent *" name="continent" value={s.continent} onChange={(ev) => set("continent", ev.target.value)} error={e("continent")}>
                <option value="">Choose…</option>
                {CONTINENTS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Grid>
            <Grid cols={3}>
              <Input label="Latitude *" name="lat" type="number" step="any" min={-90} max={90} value={s.lat} onChange={(ev) => set("lat", ev.target.value)} error={e("lat")} hint="Decimal degrees, N positive" />
              <Input label="Longitude *" name="lon" type="number" step="any" min={-180} max={180} value={s.lon} onChange={(ev) => set("lon", ev.target.value)} error={e("lon")} hint="Decimal degrees, E positive" />
              <Input label="Elevation (ft)" name="elevationFt" type="number" step={1} value={s.elevationFt} onChange={(ev) => set("elevationFt", ev.target.value)} error={e("elevationFt")} />
            </Grid>
            {s.lat && s.lon && !e("lat") && !e("lon") && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(s.lat)}&mlon=${encodeURIComponent(s.lon)}#map=13/${encodeURIComponent(s.lat)}/${encodeURIComponent(s.lon)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-brand hover:underline"
              >
                Check position on OpenStreetMap <ExternalLink className="size-3.5" />
              </a>
            )}
            <Grid>
              <Input label="Timezone" name="timezone" value={s.timezone} maxLength={60} placeholder="Asia/Kolkata" onChange={(ev) => set("timezone", ev.target.value)} error={e("timezone")} />
              <Input label="UTC offset" name="utcOffset" value={s.utcOffset} maxLength={12} placeholder="UTC+5:30" onChange={(ev) => set("utcOffset", ev.target.value)} error={e("utcOffset")} />
            </Grid>
          </FormSection>

          <FormSection title="Operations">
            <Grid>
              <Input label="Operating hours" name="operatingHours" value={s.operatingHours} maxLength={120} placeholder="24/7" onChange={(ev) => set("operatingHours", ev.target.value)} error={e("operatingHours")} />
              <Input label="Fire category" name="fireCategory" value={s.fireCategory} maxLength={20} placeholder="CAT 9" onChange={(ev) => set("fireCategory", ev.target.value)} error={e("fireCategory")} />
            </Grid>
            {/* Shown on the airport page under "More Airport Information"; blank fields show as "—". */}
            <Grid>
              <Input label="Type of traffic permitted" name="trafficPermitted" value={s.trafficPermitted} maxLength={80} placeholder="IFR / VFR" onChange={(ev) => set("trafficPermitted", ev.target.value)} error={e("trafficPermitted")} />
              <Input label="Airport light intensity" name="lightIntensity" value={s.lightIntensity} maxLength={80} placeholder="High (HIRL)" onChange={(ev) => set("lightIntensity", ev.target.value)} error={e("lightIntensity")} />
            </Grid>
            <Grid>
              <Input label="Deicing" name="deicing" value={s.deicing} maxLength={80} placeholder="Available" onChange={(ev) => set("deicing", ev.target.value)} error={e("deicing")} />
              <Input label="Airport category" name="airportCategory" value={s.airportCategory} maxLength={80} placeholder="International" onChange={(ev) => set("airportCategory", ev.target.value)} error={e("airportCategory")} />
            </Grid>
            <Grid>
              <Input label="Slots required" name="slotsRequired" value={s.slotsRequired} maxLength={80} placeholder="Yes — coordinated (Level 3)" onChange={(ev) => set("slotsRequired", ev.target.value)} error={e("slotsRequired")} />
              <Input label="Airport website" name="website" type="url" value={s.website} maxLength={200} placeholder="https://www.heathrow.com" onChange={(ev) => set("website", ev.target.value)} error={e("website")} />
            </Grid>
            <ChipInput id="serviceTags" label="Service tags" values={s.serviceTags} onChange={(v) => set("serviceTags", v)} max={20} maxLength={30} placeholder="FBO, Fuel, Customs…" error={e("serviceTags")} />
            <UploadField id="image" label="Image" kind="image" value={s.image} onChange={(v) => set("image", v)} error={e("image")} />
          </FormSection>

          <FormSection title="Runways">
            <Repeater
              items={s.runways}
              onChange={(v) => set("runways", v)}
              create={() => ({ designator: "", lengthFt: "", widthFt: "", surface: "Asphalt", lighting: true, headingDeg: "", ils: "" })}
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
                    <Grid cols={3}>
                      <Input label="Designator *" name={`${p}.designator`} value={r.designator} maxLength={20} placeholder="09/27" onChange={(ev) => update({ designator: ev.target.value })} error={e(`${p}.designator`)} />
                      <Input label="Surface *" name={`${p}.surface`} value={r.surface} maxLength={40} onChange={(ev) => update({ surface: ev.target.value })} error={e(`${p}.surface`)} />
                      <Input label="ILS" name={`${p}.ils`} value={r.ils} maxLength={20} placeholder="CAT II" onChange={(ev) => update({ ils: ev.target.value })} error={e(`${p}.ils`)} />
                    </Grid>
                    <Grid cols={3}>
                      <Input label="Length (ft) *" name={`${p}.lengthFt`} type="number" min={0} max={30000} value={r.lengthFt} onChange={(ev) => update({ lengthFt: ev.target.value })} error={e(`${p}.lengthFt`)} />
                      <Input label="Width (ft) *" name={`${p}.widthFt`} type="number" min={0} max={1000} value={r.widthFt} onChange={(ev) => update({ widthFt: ev.target.value })} error={e(`${p}.widthFt`)} />
                      <Input label="Heading (°) *" name={`${p}.headingDeg`} type="number" step="any" min={0} max={360} value={r.headingDeg} onChange={(ev) => update({ headingDeg: ev.target.value })} error={e(`${p}.headingDeg`)} />
                    </Grid>
                    <Toggle id={`${p}.lighting`} label="Runway lighting" checked={r.lighting} onChange={(lighting) => update({ lighting })} />
                  </div>
                );
              }}
            </Repeater>
          </FormSection>

          <FormSection title="Frequencies">
            <Repeater
              items={s.frequencies}
              onChange={(v) => set("frequencies", v)}
              create={() => ({ type: "", description: "", mhz: "" })}
              max={40}
              addLabel="Add frequency"
              itemLabel={(f, i) => (f.type ? `${f.type} ${f.mhz}`.trim() : `Frequency ${i + 1}`)}
              errorId="frequencies-error"
              error={e("frequencies")}
            >
              {(f, i, update) => {
                const p = `frequencies.${i}`;
                return (
                  <Grid cols={3}>
                    <Input label="Type *" name={`${p}.type`} value={f.type} maxLength={20} placeholder="TWR" onChange={(ev) => update({ type: ev.target.value })} error={e(`${p}.type`)} />
                    <Input label="Description *" name={`${p}.description`} value={f.description} maxLength={80} placeholder="Mumbai Tower" onChange={(ev) => update({ description: ev.target.value })} error={e(`${p}.description`)} />
                    <Input label="MHz *" name={`${p}.mhz`} value={f.mhz} maxLength={8} inputMode="decimal" placeholder="118.100" onChange={(ev) => update({ mhz: ev.target.value })} error={e(`${p}.mhz`)} />
                  </Grid>
                );
              }}
            </Repeater>
          </FormSection>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24">
          <Card title="Visibility">
            <div className="flex flex-col gap-3">
              <Toggle id="featured" label="Featured" description="Shown in featured airport lists on the site." checked={s.featured} onChange={(v) => set("featured", v)} />
              <Toggle id="customs" label="Customs available" checked={s.customs} onChange={(v) => set("customs", v)} />
            </div>
          </Card>
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft">
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
