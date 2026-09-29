"use client";

import { AlertTriangle, Inbox, RefreshCw, Search } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { cn } from "@/lib/utils";

/* ─────────────── Layout ─────────────── */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white p-5 shadow-soft", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-bold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/* ─────────────── States ─────────────── */

export function ErrorPanel({ error, onRetry }: { error: ApiError | Error; onRetry?: () => void }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-8 text-center">
      <AlertTriangle className="size-8 text-danger" aria-hidden />
      <p className="font-semibold text-ink">{forbidden ? "You don't have permission to view this." : "Couldn't load this data."}</p>
      <p className="text-sm text-muted">{error.message}</p>
      {onRetry && !forbidden && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-surface">
          <RefreshCw className="size-4" /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <Inbox className="size-10 text-subtle" aria-hidden />
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

/* ─────────────── Table ─────────────── */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-surface-2 text-xs font-semibold tracking-[0.4px] text-muted uppercase">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("px-4 py-3", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn("divide-y divide-line", loading && "opacity-50")} aria-busy={loading || undefined}>
            {loading && !rows?.length
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={`sk-${i}`}>
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-4">
                        <span className="block h-4 w-3/4 animate-pulse rounded bg-surface" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows?.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn("transition", onRowClick && "cursor-pointer hover:bg-brand/4")}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-3 align-middle text-ink", c.className)}>
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!loading && rows && rows.length === 0 && (empty ?? <EmptyState title="Nothing here yet" description="Try changing the filters." />)}
    </div>
  );
}

/* ─────────────── Filters (URL-synced) ─────────────── */

export function SearchFilter({ param = "q", placeholder = "Search…", label = "Search" }: { param?: string; placeholder?: string; label?: string }) {
  const { get, set } = useUrlParams();
  const current = get(param);
  const [value, setValue] = useState(current);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the box in sync when the URL changes elsewhere (back button, "clear filters").
  const [lastUrlValue, setLastUrlValue] = useState(current);
  if (lastUrlValue !== current) {
    setLastUrlValue(current);
    setValue(current);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <label className="relative block w-full sm:w-72">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        maxLength={100}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => set({ [param]: v.trim() }), 350);
        }}
        className="h-10 w-full rounded-xl border border-line bg-white pr-3 pl-9 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
      />
    </label>
  );
}

export function SelectFilter({ param, label, options }: { param: string; label: string; options: Array<{ value: string; label: string }> }) {
  const { get, set } = useUrlParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <select
        value={get(param)}
        onChange={(e) => set({ [param]: e.target.value })}
        className="h-10 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

export function Pager({ page, totalPages, total }: { page: number; totalPages: number; total: number }) {
  const { set } = useUrlParams();
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>
        {total.toLocaleString()} result{total === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => set({ page: page - 1 })} className="h-9 rounded-xl border border-line bg-white px-3 font-medium text-ink disabled:opacity-40">
          ← Prev
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button type="button" disabled={page >= totalPages} onClick={() => set({ page: page + 1 })} className="h-9 rounded-xl border border-line bg-white px-3 font-medium text-ink disabled:opacity-40">
          Next →
        </button>
      </div>
    </div>
  );
}

/* ─────────────── Status & actions ─────────────── */

const PILL_TONES: Record<string, string> = {
  green: "bg-success/10 text-[#15803d]",
  amber: "bg-warning/15 text-[#a16207]",
  red: "bg-danger/10 text-danger",
  blue: "bg-brand/10 text-brand",
  slate: "bg-slate-100 text-slate-600",
  purple: "bg-purple/10 text-purple",
};

const STATUS_TONE: Record<string, keyof typeof PILL_TONES> = {
  published: "green",
  active: "green",
  approved: "green",
  subscribed: "green",
  captured: "green",
  closed: "slate",
  completed: "slate",
  draft: "slate",
  read: "slate",
  pending: "amber",
  new: "blue",
  in_progress: "blue",
  replied: "purple",
  authorized: "blue",
  created: "slate",
  rejected: "red",
  suspended: "red",
  spam: "red",
  failed: "red",
  cancelled: "red",
  halted: "red",
  unsubscribed: "slate",
};

export function StatusPill({ status, tone }: { status: string; tone?: keyof typeof PILL_TONES }) {
  const t = tone ?? STATUS_TONE[status] ?? "slate";
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize", PILL_TONES[t])}>{status.replace(/_/g, " ")}</span>;
}

/** Button that asks for confirmation inline before running a (destructive) action. */
export function ConfirmButton({
  children,
  confirmLabel = "Confirm",
  onConfirm,
  tone = "danger",
  disabled,
}: {
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  tone?: "danger" | "primary";
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const base = "h-9 rounded-xl px-3 text-sm font-semibold transition disabled:opacity-50";
  const color = tone === "danger" ? "bg-danger text-white hover:brightness-110" : "bg-brand text-white hover:brightness-110";
  if (!asking) {
    return (
      <button type="button" disabled={disabled} onClick={() => setAsking(true)} className={cn(base, tone === "danger" ? "border border-danger/30 text-danger hover:bg-danger/5" : "border border-brand/30 text-brand hover:bg-brand/5")}>
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setAsking(false);
          }
        }}
        className={cn(base, color)}
      >
        {busy ? "Working…" : confirmLabel}
      </button>
      <button type="button" onClick={() => setAsking(false)} className={cn(base, "border border-line text-muted hover:bg-surface")}>
        Cancel
      </button>
    </span>
  );
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Formats an integer amount in the smallest currency unit (paise, cents). */
export function formatMoney(minor: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}
