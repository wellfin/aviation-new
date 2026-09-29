"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, EmptyState, ErrorPanel, FilterBar, formatDateTime, Pager, PageHeader, SelectFilter, StatusPill, type Column } from "@/components/admin/ui";
import { withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { cn } from "@/lib/utils";
import { useAccountApi } from "../hooks";
import { ENQUIRY_STATUSES, type Enquiry, type Paginated } from "../types";
import { RequirePermission } from "../ui";

export function EnquiriesInbox() {
  return (
    <RequirePermission permission="enquiries:read:own" title="Enquiries">
      <Inbox />
    </RequirePermission>
  );
}

function summary(e: Enquiry): string {
  if (e.trip) return `${e.trip.from} → ${e.trip.to} · ${e.trip.passengers} pax`;
  return e.service || "General enquiry";
}

function Inbox() {
  const router = useRouter();
  const { get, page } = useUrlParams();
  const status = ENQUIRY_STATUSES.find((s) => s === get("status"));
  const { data, error, loading, reload } = useAccountApi<Paginated<Enquiry>>(withQuery("/me/enquiries", { status, page, pageSize: 20 }));

  const columns: Column<Enquiry>[] = [
    {
      key: "from",
      header: "From",
      render: (e) => (
        <div className="min-w-0">
          <Link href={`/account/enquiries/${e.id}`} onClick={(ev) => ev.stopPropagation()} className={cn("hover:text-brand", e.status === "new" ? "font-extrabold" : "font-semibold")}>
            {e.name}
          </Link>
          <p className="truncate text-xs text-muted">{e.company || e.email}</p>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Enquiry",
      render: (e) => (
        <div className="max-w-[320px]">
          <p className="truncate">{summary(e)}</p>
          <p className="truncate text-xs text-muted">{e.message || (e.type === "fleet" ? "Charter quote request" : "")}</p>
        </div>
      ),
    },
    { key: "listing", header: "Listing", render: (e) => <span className="text-muted">{e.provider.name}</span> },
    { key: "received", header: "Received", render: (e) => <span className="whitespace-nowrap text-muted">{formatDateTime(e.createdAt)}</span> },
    { key: "status", header: "Status", render: (e) => <StatusPill status={e.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Enquiries" description="Quote requests and questions sent from your public profile." />
      <FilterBar>
        <SelectFilter param="status" label="Status" options={ENQUIRY_STATUSES.map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) }))} />
      </FilterBar>
      {error ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.items}
            rowKey={(e) => e.id}
            loading={loading}
            onRowClick={(e) => router.push(`/account/enquiries/${e.id}`)}
            empty={
              <EmptyState
                title={status ? `No ${status} enquiries` : "No enquiries yet"}
                description={
                  status
                    ? "Try another status filter."
                    : "When pilots and operators contact you from your profile, their messages appear here. Enquiries are available on Pro and Ultra Pro listings."
                }
              />
            }
          />
          {data && data.total > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} />}
        </>
      )}
    </div>
  );
}
