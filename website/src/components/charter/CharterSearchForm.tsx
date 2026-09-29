"use client";

import { Ambulance, Fan, Package, Plane, Search, Users, type LucideIcon } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { FieldError, Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import {
  AIRCRAFT_TYPES,
  CERTIFICATIONS,
  CONTINENTS,
  type AircraftType,
  type CertificationFilter,
  type CharterParams,
  type LocationOption,
} from "./filters";

const TYPE_ICONS: Record<AircraftType, LucideIcon> = {
  "private-jet": Plane,
  "air-ambulance": Ambulance,
  cargo: Package,
  helicopter: Fan,
  group: Users,
};

const selectClass = "h-11 rounded-[12px] border-brand/20 text-[15px]";

function StepCard({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)] sm:p-6">
      <legend className="float-left flex w-full items-center gap-2 text-base leading-6 font-bold text-ink">
        <span className="flex size-6 items-center justify-center rounded-lg bg-brand/12 text-xs font-black text-brand" aria-hidden>
          {step}
        </span>
        {title}
      </legend>
      <div className="clear-both pt-5">{children}</div>
    </fieldset>
  );
}

function ToggleTile({ pressed, onClick, icon: Icon, children }: { pressed: boolean; onClick: () => void; icon?: LucideIcon; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex h-[50px] items-center gap-3 rounded-[12px] border px-4 text-sm font-semibold text-white transition",
        Icon ? "justify-start" : "justify-center",
        pressed ? "bg-brand-gradient border-transparent shadow-[0_4px_14px_rgba(47,128,237,0.35)]" : "border-line bg-[#0d274c] hover:bg-navy-800",
      )}
    >
      {Icon && <Icon className="size-[18px] shrink-0" aria-hidden />}
      {children}
    </button>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Four-step "Search Air Charter Operators" form. Submits a GET to the results page. */
export function CharterSearchForm({ locations, initial }: { locations: LocationOption[]; initial?: CharterParams }) {
  const [q, setQ] = useState(initial?.q ?? "");
  const [continent, setContinent] = useState<string>(initial?.continent ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [types, setTypes] = useState<AircraftType[]>(initial?.types ?? []);
  const [certs, setCerts] = useState<CertificationFilter[]>(initial?.certs ?? []);
  const [error, setError] = useState<string>();

  const countries = useMemo(() => locations.filter((l) => !continent || l.continent === continent), [locations, continent]);
  const cities = useMemo(() => {
    const pool = country ? locations.filter((l) => l.code === country) : countries;
    return [...new Set(pool.flatMap((l) => l.cities))].sort();
  }, [locations, countries, country]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const name = q.trim();
    if (name.length === 1) {
      e.preventDefault();
      setError("Enter at least 2 characters of the company name.");
      return;
    }
    if (name.length > 80) {
      e.preventDefault();
      setError("Company name must be 80 characters or fewer.");
      return;
    }
    setError(undefined);
    // Keep the results URL clean: don't submit empty fields.
    const empties = [...e.currentTarget.elements].filter(
      (el): el is HTMLInputElement | HTMLSelectElement => (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && Boolean(el.name) && !el.value.trim(),
    );
    empties.forEach((el) => (el.disabled = true));
    window.setTimeout(() => empties.forEach((el) => (el.disabled = false)));
  }

  const searchButton = "bg-brand-gradient flex h-[52px] items-center justify-center gap-2 rounded-[12px] px-7 text-[15px] font-bold text-white transition hover:brightness-110";

  return (
    <form action="/charter-operators/results" method="get" onSubmit={onSubmit} noValidate className="flex flex-col gap-6" aria-label="Search air charter operators">
      <StepCard step={1} title="Search by Company Name">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <label htmlFor="charter-q" className="sr-only">
              Company name
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                id="charter-q"
                name="q"
                type="search"
                value={q}
                maxLength={120}
                onChange={(e) => {
                  setQ(e.target.value);
                  if (error) setError(undefined);
                }}
                placeholder="Search by Company Name"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "charter-q-error" : undefined}
                className="h-12 w-full rounded-[12px] border border-brand/20 bg-white pr-4 pl-11 text-[15px] text-ink outline-none transition placeholder:text-subtle focus:border-brand focus:ring-3 focus:ring-brand/15 aria-invalid:border-danger"
              />
            </div>
            <FieldError id="charter-q-error" message={error} />
          </div>
          <button type="submit" className={cn(searchButton, "sm:w-[222px]")}>
            <Search className="size-4" aria-hidden />
            Search Operators
          </button>
        </div>
      </StepCard>

      <StepCard step={2} title="Location">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Continent"
            id="charter-continent"
            name="continent"
            value={continent}
            onChange={(e) => {
              setContinent(e.target.value);
              setCountry("");
              setCity("");
            }}
            className={cn(selectClass, !continent && "text-subtle")}
          >
            <option value="">Select continent</option>
            {CONTINENTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            label="Country"
            id="charter-country"
            name="country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setCity("");
            }}
            className={cn(selectClass, !country && "text-subtle")}
          >
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="State"
            id="charter-state"
            name="state"
            defaultValue={initial?.state}
            maxLength={60}
            placeholder="Enter state or region"
            className={cn(selectClass, "h-11")}
          />
          <Select
            label="City"
            id="charter-city"
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={cn(selectClass, !city && "text-subtle")}
          >
            <option value="">Select city</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </StepCard>

      <StepCard step={3} title="Aircraft Type">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {AIRCRAFT_TYPES.map((t) => (
            <ToggleTile key={t.value} icon={TYPE_ICONS[t.value]} pressed={types.includes(t.value)} onClick={() => setTypes((v) => toggle(v, t.value))}>
              {t.label}
            </ToggleTile>
          ))}
        </div>
        {types.map((t) => (
          <input key={t} type="hidden" name="type" value={t} />
        ))}
      </StepCard>

      <StepCard step={4} title="Certification (Optional)">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {CERTIFICATIONS.map((c) => (
            <ToggleTile key={c.value} pressed={certs.includes(c.value)} onClick={() => setCerts((v) => toggle(v, c.value))}>
              {c.label}
            </ToggleTile>
          ))}
        </div>
        {certs.map((c) => (
          <input key={c} type="hidden" name="cert" value={c} />
        ))}
      </StepCard>

      <button type="submit" className={cn(searchButton, "w-full")}>
        <Search className="size-4" aria-hidden />
        Search Operators
      </button>
    </form>
  );
}
