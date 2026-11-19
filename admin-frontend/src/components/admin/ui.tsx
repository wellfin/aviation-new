"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RefreshCw, Search } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import { PAGE_SIZES, useUrlParams } from "@/lib/hooks/useUrlParams";
import { cn } from "@/lib/utils";

/* ─────────────── Layout ─────────────── */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-7 font-extrabold tracking-[-0.3px] text-ink">{title}</h1>
        {description && <p className="mt-0.5 truncate text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Segmented tabs with counts ("All 64 · Customers 30 …"), synced to a URL parameter.
 * The first tab should use value "" (no filter).
 */
export function StatusTabs({
  param,
  tabs,
  label = "Filter",
  current: currentProp,
  inline = false,
}: {
  param: string;
  tabs: Array<{ value: string; label: string; count?: number | null }>;
  label?: string;
  current?: string;
  /** Inside a FilterBar (no own card or margin). */
  inline?: boolean;
}) {
  const { get, set } = useUrlParams();
  const current = currentProp ?? get(param);
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full shrink-0 gap-0.5 overflow-x-auto",
        inline ? "rounded-xl bg-ink/[0.04] p-1 ring-1 ring-line/80" : "glass mb-4 rounded-2xl border p-1.5",
      )}
    >
      {tabs.map((t) => {
        const active = current === t.value;
        return (
          <button
            key={t.value || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => set({ [param]: t.value })}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition",
              active ? "bg-white text-ink shadow-[0_1px_3px_rgba(11,31,58,0.12),inset_0_0_0_1px_var(--color-line)]" : "text-muted hover:bg-white/60 hover:text-ink",
            )}
          >
            {t.label}
            {t.count != null && <span className={cn("rounded-md px-1.5 py-px text-[11px] font-bold tabular-nums", active ? "bg-brand/10 text-brand" : "bg-surface text-muted")}>{t.count.toLocaleString()}</span>}
          </button>
        );
      })}
    </div>
  );
}

const AVATAR_TONES = ["bg-brand", "bg-success", "bg-purple", "bg-[#f97316]", "bg-[#ef4444]", "bg-[#0ea5e9]", "bg-[#db2777]", "bg-[#0d9488]"];

/** Round initials badge; the colour is stable for a given name. */
export function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.charAt(0) ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "")).toUpperCase() || "?";
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full font-bold text-white", AVATAR_TONES[hash % AVATAR_TONES.length], size === "sm" ? "size-8 text-xs" : "size-10 text-sm")}>
      {initials}
    </span>
  );
}

export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode }) {
  return (
    <section className={cn("glass rounded-2xl border p-5", className)}>
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
    <div className="list-table glass overflow-hidden rounded-2xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-white/50 text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("px-3 py-2.5 whitespace-nowrap first:pl-5 last:pr-5", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn("divide-y divide-line/70 text-[13px]", loading && "opacity-50")} aria-busy={loading || undefined}>
            {loading && !rows?.length
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={`sk-${i}`}>
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-4 first:pl-5">
                        <span className="block h-4 w-3/4 animate-pulse rounded bg-surface" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows?.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn("transition", onRowClick && "cursor-pointer hover:bg-brand/[0.04]")}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-3 py-2 align-middle leading-5 text-ink first:pl-5 last:pr-5", c.className)}>
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
    <label className="relative block w-full sm:w-auto sm:min-w-48 sm:max-w-80 sm:flex-1">
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
        className="h-10 w-full rounded-xl border border-line bg-white/70 pr-3 pl-10 text-sm outline-none placeholder:text-subtle focus:border-brand focus:bg-white focus:ring-3 focus:ring-brand/15"
      />
    </label>
  );
}

export function SelectFilter({ param, label, options }: { param: string; label: string; options: Array<{ value: string; label: string }> }) {
  const { get, set } = useUrlParams();
  return (
    <label className="flex items-center text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={get(param)}
        onChange={(e) => set({ [param]: e.target.value })}
        className="h-10 min-w-36 rounded-xl border border-line bg-white/70 px-3 text-sm text-ink outline-none focus:border-brand focus:bg-white focus:ring-3 focus:ring-brand/15"
      >
        <option value="">{`${label}: All`}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Search and filters; directly above a DataTable it becomes the top of the same card. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="list-toolbar glass mb-4 flex flex-col gap-2.5 rounded-2xl border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

/** Page numbers to show: first, last, and a window around the current page, with gaps ("…"). */
function pageWindow(page: number, totalPages: number): Array<number | "gap"> {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  if (page <= 3) [2, 3, 4].forEach((p) => p <= totalPages && pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => p >= 1 && pages.add(p));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

/**
 * List footer: rows per page, "Showing 1–20 of 64", page numbers. Directly below a DataTable it
 * becomes the bottom of the same card. Rows per page is kept in the URL (?pageSize=).
 */
export function Pager({ page, totalPages, total, pageSize: sizeProp, sizes = true }: { page: number; totalPages: number; total: number; pageSize?: number; sizes?: boolean }) {
  const { set, pageSize: urlSize } = useUrlParams();
  const pageSize = sizeProp ?? urlSize;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "flex size-8 items-center justify-center rounded-lg text-[13px] font-semibold tabular-nums transition";
  return (
    <div className="list-pager glass mt-4 flex flex-col gap-2 rounded-2xl border px-5 py-2.5 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {sizes && (
          <label className="flex items-center gap-2">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => set({ pageSize: Number(e.target.value) === 20 ? "" : e.target.value })}
              className="h-8 rounded-lg border border-line bg-white/70 px-2 font-semibold text-ink outline-none focus:border-brand"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <span>
          Showing{" "}
          <b className="font-semibold text-ink">
            {from.toLocaleString()}–{to.toLocaleString()}
          </b>{" "}
          of <b className="font-semibold text-ink">{total.toLocaleString()}</b>
        </span>
      </div>
      <nav className="flex items-center gap-1" aria-label="Pages">
        <span className="mr-2 hidden sm:inline">
          Page {page} of {totalPages}
        </span>
        <button type="button" disabled={page <= 1} onClick={() => set({ page: page - 1 })} aria-label="Previous page" className={cn(btn, "border border-line text-ink hover:bg-surface disabled:opacity-40")}>
          <ChevronLeft className="size-4" />
        </button>
        {pageWindow(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="px-1 text-subtle">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => set({ page: p })}
              aria-current={p === page ? "page" : undefined}
              className={cn(btn, p === page ? "bg-brand text-white shadow-[0_4px_12px_rgba(47,128,237,0.35)]" : "text-ink hover:bg-surface")}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" disabled={page >= totalPages} onClick={() => set({ page: page + 1 })} aria-label="Next page" className={cn(btn, "border border-line text-ink hover:bg-surface disabled:opacity-40")}>
          <ChevronRight className="size-4" />
        </button>
      </nav>
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
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap capitalize", PILL_TONES[t])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status.replace(/_/g, " ")}
    </span>
  );
}

/**
 * On/off switch (pill with a sliding knob). With `label` it renders the text beside it;
 * without one, pass `aria-label`.
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  "aria-label": ariaLabel,
  className,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  const input = (
    <input
      type="checkbox"
      role="switch"
      className="switch"
      checked={checked}
      disabled={disabled}
      aria-label={label ? undefined : ariaLabel}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
  if (!label) return input;
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2.5 text-sm", disabled && "cursor-not-allowed", className)}>
      {input}
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{label}</span>
        {description && <span className="block text-xs font-normal text-muted">{description}</span>}
      </span>
    </label>
  );
}

/** Setting row: title and help text on the left, a switch on the right. */
export function SwitchRow({ label, description, checked, onChange, disabled }: { label: ReactNode; description?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-white/70 px-4 py-3 transition hover:border-brand/40", disabled && "cursor-not-allowed opacity-70")}>
      <span className="min-w-0 text-sm">
        <span className="block font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <input type="checkbox" role="switch" className="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
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
  const base = "h-8 rounded-lg px-2.5 text-[13px] font-semibold whitespace-nowrap transition disabled:opacity-50";
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
