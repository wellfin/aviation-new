"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import type { FleetAircraft } from "@/lib/types";
import { EditorSection, move, RowControls, Thumb, UploadButton, UsageMeter, useSectionSave } from "./editor-kit";
import { FLEET_CATEGORIES, fleetSchema } from "./schema";
import type { SectionProps } from "./TextSections";

/** Numeric fields are edited as strings so partially typed values don't jump. */
interface Row {
  id: string;
  model: string;
  category: FleetAircraft["category"];
  seats: string;
  rangeNm: string;
  speedKts: string;
  baseIcao: string;
  image: string;
  yearOfManufacture: string;
}

const toRow = (f: FleetAircraft): Row => ({
  id: f.id,
  model: f.model,
  category: f.category,
  seats: String(f.seats),
  rangeNm: String(f.rangeNm),
  speedKts: String(f.speedKts),
  baseIcao: f.baseIcao,
  image: f.image,
  yearOfManufacture: f.yearOfManufacture ? String(f.yearOfManufacture) : "",
});

const num = (v: string) => (v.trim() === "" ? Number.NaN : Number(v));

export function FleetSection({ listing, onSaved }: SectionProps) {
  const [rows, setRows] = useState<Row[]>(listing.fleet.map(toRow));
  const { errors, saving, status, save } = useSectionSave(fleetSchema, (l) => {
    // Adopt server ids for newly created aircraft.
    setRows(l.fleet.map(toRow));
    onSaved(l);
  });
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, k: string) => errors[`fleet.${i}.${k}`];

  function submit() {
    void save({
      fleet: rows.map((r) => ({
        id: r.id,
        model: r.model,
        category: r.category,
        seats: num(r.seats),
        rangeNm: num(r.rangeNm),
        speedKts: num(r.speedKts),
        baseIcao: r.baseIcao.trim(),
        image: r.image,
        ...(r.yearOfManufacture.trim() ? { yearOfManufacture: num(r.yearOfManufacture) } : {}),
      })),
    });
  }

  return (
    <EditorSection
      id="fleet"
      title="Aircraft fleet"
      description="Aircraft customers can request a quote for from your profile."
      meta={<UsageMeter used={rows.length} max={50} label="aircraft" />}
      saving={saving}
      status={status}
      onSubmit={submit}
    >
      {errors.fleet && (
        <p role="alert" className="text-sm font-medium text-danger">
          {errors.fleet}
        </p>
      )}
      {rows.length === 0 && <p className="text-sm text-muted">No aircraft yet.</p>}
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.id || `new-${i}`} className="rounded-xl border border-line bg-surface-2 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink">{r.model || `Aircraft ${i + 1}`}</p>
              <RowControls index={i} count={rows.length} label={`aircraft ${i + 1}`} onMove={(a, b) => setRows((x) => move(x, a, b))} onRemove={() => setRows((x) => x.filter((_, j) => j !== i))} />
            </div>
            <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
              <div className="space-y-2">
                <Thumb src={r.image} alt={r.model ? `${r.model} photo` : "Aircraft photo"} className="aspect-[4/3] w-full rounded-xl border border-line" />
                <UploadButton kind="image" variant="ghost" label={r.image ? "Replace photo" : "Add photo"} onUploaded={(f) => update(i, { image: f.url })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Input name={`fleet-${i}-model`} label="Model" placeholder="e.g. Gulfstream G650" value={r.model} onChange={(e) => update(i, { model: e.target.value })} error={err(i, "model")} maxLength={100} />
                <Select name={`fleet-${i}-category`} label="Category" value={r.category} onChange={(e) => update(i, { category: e.target.value as Row["category"] })} error={err(i, "category")}>
                  {FLEET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                <Input name={`fleet-${i}-seats`} label="Seats" type="number" inputMode="numeric" min={1} max={600} value={r.seats} onChange={(e) => update(i, { seats: e.target.value })} error={err(i, "seats")} />
                <Input name={`fleet-${i}-range`} label="Range (NM)" type="number" inputMode="numeric" min={0} max={20000} value={r.rangeNm} onChange={(e) => update(i, { rangeNm: e.target.value })} error={err(i, "rangeNm")} />
                <Input name={`fleet-${i}-speed`} label="Speed (KTAS)" type="number" inputMode="numeric" min={0} max={800} value={r.speedKts} onChange={(e) => update(i, { speedKts: e.target.value })} error={err(i, "speedKts")} />
                <Input name={`fleet-${i}-base`} label="Base (ICAO)" placeholder="e.g. KTEB" value={r.baseIcao} onChange={(e) => update(i, { baseIcao: e.target.value.toUpperCase() })} error={err(i, "baseIcao")} maxLength={4} className="font-mono uppercase" />
                <Input name={`fleet-${i}-year`} label="Year built" type="number" inputMode="numeric" min={1950} max={2100} placeholder="Optional" value={r.yearOfManufacture} onChange={(e) => update(i, { yearOfManufacture: e.target.value })} error={err(i, "yearOfManufacture")} />
              </div>
            </div>
            {err(i, "image") && <p className="mt-1 text-xs text-danger">{err(i, "image")}</p>}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={rows.length >= 50}
        onClick={() => setRows((r) => [...r, { id: "", model: "", category: "Light Jet", seats: "", rangeNm: "", speedKts: "", baseIcao: "", image: "", yearOfManufacture: "" }])}
      >
        <Plus className="size-4" aria-hidden /> Add aircraft
      </Button>
    </EditorSection>
  );
}
