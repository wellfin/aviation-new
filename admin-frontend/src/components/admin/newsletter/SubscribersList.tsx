"use client";

import { DataTable, ErrorPanel, FilterBar, PageHeader, Pager, SearchFilter, SelectFilter, StatusPill, formatDateTime, type Column } from "@/components/admin/ui";
import type { Paginated } from "@/components/admin/enquiries/types";
import { CsvExportLink } from "@/components/admin/leads/CsvExportLink";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { cn } from "@/lib/utils";

const STATUSES = ["subscribed", "pending", "unsubscribed"] as const;
type SubscriberStatus = (typeof STATUSES)[number];

const STATUS_LABEL: Record<SubscriberStatus, string> = {
  subscribed: "Subscribed",
  pending: "Awaiting confirmation",
  unsubscribed: "Unsubscribed",
};

interface Subscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  source: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 25;

/** Total for one status (a 1-row page is enough — only `total` is used). */
function useCount(status: SubscriberStatus) {
  const { data, loading } = useApi<Paginated<Subscriber>>(`/admin/newsletter/subscribers?status=${status}&pageSize=1`);
  return loading ? null : (data?.total ?? null);
}

export function SubscribersList() {
  const { get, set, page } = useUrlParams();
  const statusParam = get("status");
  const status = (STATUSES as readonly string[]).includes(statusParam) ? (statusParam as SubscriberStatus) : "";
  const { data, error, loading, reload } = useApi<Paginated<Subscriber>>(withQuery("/admin/newsletter/subscribers", { page, pageSize: PAGE_SIZE, status, q: get("q").trim() }));
  const counts: Record<SubscriberStatus, number | null> = { subscribed: useCount("subscribed"), pending: useCount("pending"), unsubscribed: useCount("unsubscribed") };

  const columns: Column<Subscriber>[] = [
    { key: "email", header: "Email", render: (s) => <span className="font-semibold">{s.email}</span> },
    { key: "status", header: "Status", render: (s) => <StatusPill status={s.status} /> },
    { key: "source", header: "Source", render: (s) => <span className="text-muted">{s.source}</span> },
    { key: "signed", header: "Signed up", render: (s) => <span className="whitespace-nowrap text-muted">{formatDateTime(s.createdAt)}</span> },
    { key: "confirmed", header: "Confirmed", render: (s) => <span className="whitespace-nowrap text-muted">{formatDateTime(s.confirmedAt)}</span> },
    { key: "unsub", header: "Unsubscribed", render: (s) => <span className="whitespace-nowrap text-muted">{formatDateTime(s.unsubscribedAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Newsletter"
        description="Double opt-in subscribers. Only confirmed (subscribed) addresses should receive mailings."
        actions={<CsvExportLink path="/admin/newsletter/subscribers/export.csv" params={{ status: status || undefined }} title="Exports every subscriber with the selected status." />}
      />
      <ul className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Subscriber counts">
        {STATUSES.map((s) => (
          <li key={s}>
            <button
              type="button"
              aria-pressed={status === s}
              onClick={() => set({ status: status === s ? "" : s })}
              className={cn(
                "w-full rounded-2xl border bg-white p-4 text-left shadow-soft transition hover:border-brand/40",
                status === s ? "border-brand ring-3 ring-brand/15" : "border-line",
              )}
            >
              <span className="block text-xs font-semibold tracking-[0.6px] text-muted uppercase">{STATUS_LABEL[s]}</span>
              <span className="mt-1 block text-2xl font-extrabold text-ink">{counts[s] === null ? "—" : counts[s].toLocaleString()}</span>
            </button>
          </li>
        ))}
      </ul>
      <FilterBar>
        <SearchFilter placeholder="Search by email" label="Search subscribers" />
        <SelectFilter param="status" label="Status" options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
      </FilterBar>
      {error ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : (
        <>
          <DataTable columns={columns} rows={data?.items} rowKey={(s) => s.id} loading={loading} />
          {data && data.total > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} />}
        </>
      )}
    </>
  );
}
