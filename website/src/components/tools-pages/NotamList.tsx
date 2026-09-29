"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { Notam } from "@/lib/types";
import { cn } from "@/lib/utils";

export type NotamStatus = "Active" | "Scheduled" | "Expired";

export interface NotamView extends Notam {
  status: NotamStatus;
  /** Pre-formatted on the server so both renders agree. */
  fromLabel: string;
  toLabel: string;
}

const STATUS_TONE: Record<NotamStatus, string> = {
  Active: "bg-success/8 text-[#16a34a]",
  Scheduled: "bg-warning/10 text-[#b45309]",
  Expired: "bg-slate-100 text-slate-500",
};

function borderFor(n: NotamView): string {
  if (n.severity === "critical") return "border-l-[#eb5757]";
  if (n.status === "Active") return "border-l-success";
  if (n.status === "Scheduled") return "border-l-warning";
  return "border-l-subtle";
}

const selectClass =
  "h-9 appearance-none rounded-xl border border-brand/20 bg-white bg-[url('/images/shared/chevron-down-dark.svg')] bg-[length:10px] bg-[right_12px_center] bg-no-repeat pr-9 pl-4 text-[15px] text-ink outline-none focus:border-brand focus:ring-3 focus:ring-brand/15";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-lg bg-brand/8 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/15" aria-live="polite">
      {copied ? (
        <>
          <Check className="size-3.5" aria-hidden /> Copied
        </>
      ) : (
        "Copy"
      )}
    </button>
  );
}

function NotamCard({ n, airportName }: { n: NotamView; airportName: string }) {
  return (
    <article
      className={cn(
        "rounded-[20px] border-l-4 bg-white p-5 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]",
        borderFor(n),
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {n.severity === "critical" && (
              <span className="rounded-full border border-[#eb5757]/25 bg-[#eb5757]/10 px-2 py-0.5 text-[10px] leading-[15px] font-black text-[#eb5757]">⚠ CRITICAL</span>
            )}
            {n.severity === "warning" && (
              <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] leading-[15px] font-black text-[#b45309]">CAUTION</span>
            )}
            <span className="rounded-full bg-brand/8 px-2 py-0.5 text-[10px] leading-[15px] font-bold text-brand">{n.type}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] leading-[15px] font-bold", STATUS_TONE[n.status])}>{n.status}</span>
            <span className="font-mono text-[10px] text-subtle">{n.number}</span>
          </div>
          <h3 className="pt-1 text-base leading-6 font-bold text-ink">{n.subject}</h3>
          <p className="pt-0.5 text-xs text-muted">
            {airportName} · {n.icao}
          </p>
        </div>
        <div className="shrink-0 text-xs sm:text-right">
          <p className="font-semibold text-subtle">VALID</p>
          <p className="pt-0.5 text-ink">{n.fromLabel}</p>
          <p className="text-muted">→ {n.toLabel}</p>
        </div>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-xl border border-navy-900/6 bg-navy-900/3 p-3 font-mono text-xs leading-[19.5px] whitespace-pre-wrap text-[#475569]">
        {n.text}
      </pre>
      <div className="flex gap-2 pt-3">
        <CopyButton text={`${n.number} ${n.text}`} />
        <Link href={`/airports/${n.icao}`} className="rounded-lg bg-brand/8 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/15">
          View Airport
        </Link>
      </div>
    </article>
  );
}

/** NOTAM results with client-side type / status / critical-only filters. */
export function NotamList({ notams, airportName }: { notams: NotamView[]; airportName: string }) {
  const id = useId();
  const [type, setType] = useState("all");
  const [status, setStatus] = useState<"all" | NotamStatus>("all");
  const [criticalOnly, setCriticalOnly] = useState(false);

  const types = useMemo(() => [...new Set(notams.map((n) => n.type))].sort(), [notams]);
  const visible = notams.filter(
    (n) => (type === "all" || n.type === type) && (status === "all" || n.status === status) && (!criticalOnly || n.severity === "critical"),
  );
  const counts = {
    critical: notams.filter((n) => n.severity === "critical").length,
    warning: notams.filter((n) => n.severity === "warning").length,
  };
  const filtered = visible.length !== notams.length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[20px] bg-white p-4 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
        <span className="text-sm font-semibold text-muted">Filter:</span>
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-type`} className="text-xs font-semibold text-muted">
            TYPE
          </label>
          <select id={`${id}-type`} value={type} onChange={(e) => setType(e.target.value)} className={cn(selectClass, "min-w-[147px]")}>
            <option value="all">All</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-status`} className="text-xs font-semibold text-muted">
            STATUS
          </label>
          <select
            id={`${id}-status`}
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | NotamStatus)}
            className={cn(selectClass, "min-w-[122px]")}
          >
            <option value="all">All</option>
            <option value="Active">Active</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-muted">
          <input type="checkbox" checked={criticalOnly} onChange={(e) => setCriticalOnly(e.target.checked)} className="size-3.5 accent-brand" />
          Critical only
        </label>
        <p className="w-full text-sm text-subtle sm:ml-auto sm:w-auto" aria-live="polite">
          {filtered ? `${visible.length} of ${notams.length}` : notams.length} NOTAM{notams.length === 1 ? "" : "s"}
          {counts.critical > 0 && <span className="text-[#eb5757]"> · {counts.critical} critical</span>}
          {counts.warning > 0 && <span className="text-[#b45309]"> · {counts.warning} caution</span>}
        </p>
      </div>

      {visible.length ? (
        <div className="mt-6 space-y-4">
          {visible.map((n) => (
            <NotamCard key={n.id} n={n} airportName={airportName} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[20px] bg-white px-6 py-14 text-center shadow-soft">
          <p className="font-bold text-ink">No NOTAMs match these filters</p>
          <button
            type="button"
            onClick={() => {
              setType("all");
              setStatus("all");
              setCriticalOnly(false);
            }}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
          >
            Clear filters <ChevronDown className="size-4 -rotate-90" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
