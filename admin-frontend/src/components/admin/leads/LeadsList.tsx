"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { DataTable, ErrorPanel, FilterBar, Pager, SearchFilter, SelectFilter, StatusPill, formatDateTime, type Column } from "@/components/admin/ui";
import { DateRangeFilter, dateParam, isInvertedRange } from "@/components/admin/enquiries/DateRangeFilter";
import type { Paginated } from "@/components/admin/enquiries/types";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { CsvExportLink } from "./CsvExportLink";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, LEAD_TYPES, LEAD_TYPE_LABEL, type LeadSummary } from "./types";

const PAGE_SIZE = 20;
const oneOf = <T extends string>(list: readonly T[], v: string): T | "" => ((list as readonly string[]).includes(v) ? (v as T) : "");

/** Current URL filters for the leads list (validated). Shared by the list and its export link. */
export function useLeadFilters() {
  const { get, page } = useUrlParams();
  const from = dateParam(get("from"));
  const to = dateParam(get("to"));
  return {
    page,
    type: oneOf(LEAD_TYPES, get("type")),
    status: oneOf(LEAD_STATUSES, get("status")),
    q: get("q").trim(),
    from,
    to,
    inverted: isInvertedRange(from, to),
  };
}

export function LeadsExportLink() {
  const f = useLeadFilters();
  return (
    <CsvExportLink
      path="/admin/leads/export.csv"
      params={{ type: f.type || undefined, status: f.status || undefined, from: f.from || undefined, to: f.to || undefined }}
      title="Exports every lead matching the type, status and date filters (the search box isn't applied)."
    />
  );
}

export function LeadsList() {
  const router = useRouter();
  const f = useLeadFilters();
  const path = f.inverted
    ? null
    : withQuery("/admin/leads", { page: f.page, pageSize: PAGE_SIZE, type: f.type, status: f.status, q: f.q, from: f.from, to: f.to });
  const { data, error, loading, reload } = useApi<Paginated<LeadSummary>>(path);

  const columns: Column<LeadSummary>[] = [
    {
      key: "name",
      header: "Lead",
      render: (l) => (
        <Link href={`/admin/leads/${l.id}`} onClick={(e) => e.stopPropagation()} className="block font-semibold text-ink hover:text-brand">
          {l.name}
          <span className="block text-xs font-normal text-muted">
            {l.email}
            {l.company ? ` · ${l.company}` : ""}
          </span>
        </Link>
      ),
    },
    { key: "type", header: "Type", render: (l) => LEAD_TYPE_LABEL[l.type] },
    { key: "status", header: "Status", render: (l) => <StatusPill status={l.status} /> },
    { key: "assignee", header: "Assignee", render: (l) => (l.assignedTo ? l.assignedTo.name : <span className="text-subtle">Unassigned</span>) },
    {
      key: "notes",
      header: "Notes",
      render: (l) => (
        <span className="relative inline-flex items-center gap-1 text-muted">
          <MessageSquare className="size-3.5" aria-hidden /> {l.notesCount}
          <span className="sr-only"> notes</span>
        </span>
      ),
    },
    { key: "received", header: "Received", render: (l) => <span className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</span> },
  ];

  return (
    <>
      <FilterBar>
        <SearchFilter placeholder="Name, email, company or message" label="Search leads" />
        <SelectFilter param="type" label="Type" options={LEAD_TYPES.map((t) => ({ value: t, label: LEAD_TYPE_LABEL[t] }))} />
        <SelectFilter param="status" label="Status" options={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABEL[s] }))} />
        <DateRangeFilter />
      </FilterBar>
      {error ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : (
        <>
          <DataTable columns={columns} rows={f.inverted ? [] : data?.items} rowKey={(l) => l.id} loading={loading} onRowClick={(l) => router.push(`/admin/leads/${l.id}`)} />
          {data && !f.inverted && data.total > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} />}
        </>
      )}
    </>
  );
}
