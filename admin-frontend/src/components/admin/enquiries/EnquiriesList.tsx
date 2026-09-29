"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, ErrorPanel, FilterBar, Pager, SearchFilter, SelectFilter, StatusPill, formatDateTime, type Column } from "@/components/admin/ui";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { DateRangeFilter, dateParam, dayEnd, dayStart, isInvertedRange } from "./DateRangeFilter";
import { ENQUIRY_STATUSES, STATUS_OPTIONS, type AdminEnquiry, type Paginated } from "./types";

const PAGE_SIZE = 20;

export function EnquiriesList() {
  const router = useRouter();
  const { get, page } = useUrlParams();
  const statusParam = get("status");
  const status = (ENQUIRY_STATUSES as readonly string[]).includes(statusParam) ? statusParam : "";
  const from = dateParam(get("from"));
  const to = dateParam(get("to"));
  const inverted = isInvertedRange(from, to);

  const path = inverted
    ? null
    : withQuery("/admin/enquiries", {
        page,
        pageSize: PAGE_SIZE,
        status,
        provider: get("provider").trim(),
        q: get("q").trim(),
        from: dayStart(from),
        to: dayEnd(to),
      });
  const { data, error, loading, reload } = useApi<Paginated<AdminEnquiry>>(path);

  const columns: Column<AdminEnquiry>[] = [
    {
      key: "from",
      header: "From",
      render: (e) => (
        <Link href={`/admin/enquiries/${e.id}`} onClick={(ev) => ev.stopPropagation()} className="block font-semibold text-ink hover:text-brand">
          {e.name}
          <span className="block text-xs font-normal text-muted">{e.email}</span>
        </Link>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      render: (e) => <span className="font-medium">{e.provider.name || e.provider.slug || "Deleted listing"}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (e) =>
        e.type === "fleet" && e.trip ? (
          <span>
            Fleet charter
            <span className="block text-xs text-muted">
              {e.trip.from} → {e.trip.to}
            </span>
          </span>
        ) : (
          <span>
            General
            <span className="block max-w-56 truncate text-xs text-muted">{e.service}</span>
          </span>
        ),
    },
    { key: "status", header: "Status", render: (e) => <StatusPill status={e.status} /> },
    { key: "received", header: "Received", render: (e) => <span className="whitespace-nowrap text-muted">{formatDateTime(e.createdAt)}</span> },
  ];

  return (
    <>
      <FilterBar>
        <SearchFilter placeholder="Name, email, company or message" label="Search enquiries" />
        <SearchFilter param="provider" placeholder="Provider slug or id" label="Filter by provider" />
        <SelectFilter param="status" label="Status" options={STATUS_OPTIONS} />
        <DateRangeFilter />
      </FilterBar>
      {error ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={inverted ? [] : data?.items}
            rowKey={(e) => e.id}
            loading={loading}
            onRowClick={(e) => router.push(`/admin/enquiries/${e.id}`)}
          />
          {data && !inverted && data.total > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} />}
        </>
      )}
    </>
  );
}
