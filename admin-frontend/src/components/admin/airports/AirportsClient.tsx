"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Star } from "lucide-react";
import { useState } from "react";
import { DataTable, EmptyState, ErrorPanel, FilterBar, PageHeader, Pager, SearchFilter, SelectFilter, StatusPill, type Column } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { FormStatus } from "@/components/ui/Field";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import type { Paginated } from "@/lib/types";
import { Flag } from "@/components/ui/Flag";
import { DeleteAirportButton } from "./DeleteAirportButton";
import { AIRPORT_TYPES, CONTINENTS, type AdminAirport } from "./schema";

const TYPE_LABEL = Object.fromEntries(AIRPORT_TYPES.map((t) => [t.value, t.label]));

export function AirportsClient() {
  const router = useRouter();
  const { get, set, page } = useUrlParams();
  const country = get("country");
  const path = withQuery("/admin/airports", {
    q: get("q"),
    continent: get("continent"),
    country: /^[A-Za-z]{2}$/.test(country) ? country : undefined,
    featured: get("featured"),
    sort: get("sort"),
    page,
    pageSize: 20,
  });
  const { data, error, loading, reload } = useApi<Paginated<AdminAirport>>(path);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string; icao?: string } | null>(null);

  const columns: Column<AdminAirport>[] = [
    {
      key: "code",
      header: "Codes",
      render: (a) => (
        <Link href={`/admin/airports/${a.icao}`} onClick={(e) => e.stopPropagation()} className="font-mono font-bold text-ink hover:text-brand">
          {a.icao}
          {a.iata && <span className="ml-1.5 font-normal text-muted">{a.iata}</span>}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Airport",
      render: (a) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold">
            {a.name}
            {a.featured && <Star className="size-3.5 shrink-0 fill-warning text-warning" aria-label="Featured" />}
          </p>
          <p className="text-xs text-muted">{TYPE_LABEL[a.type]}</p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (a) => (
        <span className="whitespace-nowrap">
          <Flag code={a.countryCode} /> {a.city}, {a.country}
        </span>
      ),
    },
    { key: "continent", header: "Continent", render: (a) => a.continent },
    { key: "services", header: "Listings", render: (a) => <span className="tabular-nums">{a.servicesCount}</span>, className: "text-right" },
    { key: "customs", header: "Customs", render: (a) => (a.customs ? <StatusPill status="yes" tone="green" /> : <StatusPill status="no" tone="slate" />) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (a) => (
        <span onClick={(e) => e.stopPropagation()} className="inline-flex">
          <DeleteAirportButton
            icao={a.icao}
            onDeleted={() => {
              setFeedback({ status: "success", message: `${a.icao} deleted.` });
              reload();
            }}
            onError={(message, inUse) => setFeedback({ status: "error", message, icao: inUse ? a.icao : undefined })}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Airports"
        description="The airport database behind search, airport pages and listings."
        actions={
          <Link href="/admin/airports/new" className={buttonClasses("primary", "md")}>
            <Plus className="size-4" /> New airport
          </Link>
        }
      />
      {feedback && (
        <div className="mb-4 flex flex-col gap-1">
          <FormStatus status={feedback.status} message={feedback.message} />
          {feedback.icao && (
            <Link href={`/admin/providers?q=${feedback.icao}`} className="text-sm font-semibold text-brand hover:underline">
              See listings that use {feedback.icao} →
            </Link>
          )}
        </div>
      )}
      <FilterBar>
        <SearchFilter placeholder="Code, name or city…" label="Search airports" />
        <SelectFilter param="continent" label="Continent" options={CONTINENTS.map((c) => ({ value: c, label: c }))} />
        <CountryFilter value={country} onChange={(v) => set({ country: v })} />
        <SelectFilter param="featured" label="Featured" options={[{ value: "true", label: "Featured" }, { value: "false", label: "Not featured" }]} />
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sort</span>
          <select value={get("sort", "icao")} onChange={(e) => set({ sort: e.target.value === "icao" ? "" : e.target.value })} className="h-10 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand">
            <option value="icao">ICAO</option>
            <option value="name">Name</option>
            <option value="services">Most listings</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </FilterBar>
      {error && !data ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.items}
            rowKey={(a) => a.icao}
            loading={loading}
            onRowClick={(a) => router.push(`/admin/airports/${a.icao}`)}
            empty={<EmptyState title="No airports match" description="Try a different search or filter." />}
          />
          {data && data.total > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} />}
        </>
      )}
    </>
  );
}

/** Two-letter country code filter; applied once it's a complete code (or cleared). */
function CountryFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [last, setLast] = useState(value);
  if (last !== value) {
    setLast(value);
    setDraft(value);
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Country</span>
      <input
        value={draft}
        maxLength={2}
        placeholder="IN"
        onChange={(e) => {
          const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
          setDraft(v);
          if (v.length === 2 || v.length === 0) onChange(v);
        }}
        className="h-10 w-16 rounded-xl border border-line bg-white px-3 text-sm uppercase outline-none focus:border-brand"
      />
    </label>
  );
}
