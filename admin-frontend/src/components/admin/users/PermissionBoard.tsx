"use client";

import { BarChart3, FolderKanban, Newspaper, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PermissionGroup {
  label: string;
  items: Array<{ value: string; label: string; hint: string }>;
}

const GROUP_ICON: Record<string, LucideIcon> = { Overview: BarChart3, Directory: FolderKanban, Content: Newspaper, Customers: Users };

/**
 * Permissions as group cards: each permission is a switch, and each group has an
 * "all on / off" switch in its header with a count.
 */
export function PermissionBoard({ groups, selected, onToggle, disabled }: { groups: PermissionGroup[]; selected: Set<string>; onToggle: (values: string[], on: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const Icon = GROUP_ICON[g.label] ?? FolderKanban;
        const on = g.items.filter((i) => selected.has(i.value)).length;
        const all = on === g.items.length;
        return (
          <section key={g.label} className="glass rounded-2xl border" aria-label={g.label}>
            <header className="flex items-center gap-3 border-b border-line/80 px-5 py-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/15 to-brand-cyan/10 text-brand ring-1 ring-brand/10" aria-hidden>
                <Icon className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold text-ink">{g.label}</h3>
                <p className="text-xs text-muted">
                  {on} of {g.items.length} allowed
                </p>
              </div>
              <label className={cn("flex items-center gap-2 text-xs font-semibold text-muted", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
                All
                <input type="checkbox" role="switch" className="switch" checked={all} disabled={disabled} onChange={(e) => onToggle(g.items.map((i) => i.value), e.target.checked)} aria-label={`All ${g.label} permissions`} />
              </label>
            </header>
            <ul className="grid gap-2 p-3 sm:grid-cols-2">
              {g.items.map((p) => {
                const checked = selected.has(p.value);
                return (
                  <li key={p.value}>
                    <label
                      className={cn(
                        "flex h-full items-start justify-between gap-3 rounded-xl border px-3.5 py-3 transition",
                        checked ? "border-brand/30 bg-brand/[0.05]" : "border-line bg-white/60 hover:border-brand/30",
                        disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{p.label}</span>
                        <span className="mt-0.5 block text-xs text-muted">{p.hint}</span>
                      </span>
                      <input type="checkbox" role="switch" className="switch mt-0.5" checked={checked} disabled={disabled} onChange={(e) => onToggle([p.value], e.target.checked)} />
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Right-rail summary: overall % and a bar per group, with select-all / clear. */
export function PermissionSummary({ groups, selected, onAll, disabled }: { groups: PermissionGroup[]; selected: Set<string>; onAll: (on: boolean) => void; disabled?: boolean }) {
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  const count = groups.reduce((s, g) => s + g.items.filter((i) => selected.has(i.value)).length, 0);
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="glass rounded-2xl border p-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">Access</p>
          <p className="text-2xl leading-8 font-extrabold text-ink tabular-nums">
            {count}
            <span className="text-sm font-semibold text-muted"> / {total}</span>
          </p>
        </div>
        <span className="text-sm font-bold text-brand tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-ink/[0.06]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Permissions allowed">
        <div className="h-2 rounded-full bg-gradient-to-r from-brand to-brand-cyan transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {groups.map((g) => {
          const on = g.items.filter((i) => selected.has(i.value)).length;
          return (
            <li key={g.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-ink">{g.label}</span>
                <span className="font-semibold text-muted tabular-nums">
                  {on}/{g.items.length}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-ink/[0.06]">
                <div className="h-1.5 rounded-full bg-brand transition-all" style={{ width: `${(on / g.items.length) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {!disabled && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onAll(true)} className="h-9 rounded-xl border border-line bg-white/70 text-xs font-semibold text-ink transition hover:border-brand/40 hover:text-brand">
            Select all
          </button>
          <button type="button" onClick={() => onAll(false)} className="h-9 rounded-xl border border-line bg-white/70 text-xs font-semibold text-ink transition hover:border-danger/40 hover:text-danger">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
