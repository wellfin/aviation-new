"use client";

import Link from "next/link";
import { Check, Crown, KeyRound, Lock, Minus, Plus, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Card, EmptyState, ErrorPanel, PageHeader } from "@/components/admin/ui";
import { BarList, SERIES_COLORS } from "@/components/admin/dashboard/charts";
import { ButtonLink } from "@/components/ui/Button";
import { can, useAuth } from "@/lib/auth/auth-context";
import { useApi } from "@/lib/hooks/useApi";
import { cn } from "@/lib/utils";
import { BUILT_IN_TEXT, PERMISSION_GROUPS, PERMISSION_LABEL, USERS_MANAGE_ITEM, type BuiltInRole, type StaffRole } from "./roles";

const usersText = (n: number) => `${n} user${n === 1 ? "" : "s"}`;

/** Every console permission, in menu order (the rows of the matrix). */
const ALL_PERMS = [...PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))), { ...USERS_MANAGE_ITEM, group: "Customers" }];

interface Column {
  key: string;
  name: string;
  users: number;
  /** null = everything */
  permissions: string[] | null;
  href?: string;
  locked?: boolean;
  tone: string;
}

/** Roles & permissions: who has which role and what each role can do, dashboard-style. */
export function RolesClient() {
  const { user: me } = useAuth();
  const custom = useApi<StaffRole[]>("/admin/roles");
  const builtIn = useApi<BuiltInRole[]>("/admin/roles/built-in");
  const canManage = can(me, "users:manage");

  const columns: Column[] = [];
  for (const r of builtIn.data ?? []) {
    if (r.key === "MANAGER" && r.userCount === 0) continue; // the plain Manager role is no longer offered
    const editable = Boolean(me?.superAdmin) && r.editable.length > 0;
    const everything = r.key === "SUPER_ADMIN" || r.editable.every((p) => r.permissions.includes(p));
    columns.push({
      key: r.key,
      name: BUILT_IN_TEXT[r.key].name,
      users: r.userCount,
      permissions: everything ? null : r.permissions,
      href: editable ? `/admin/roles/built-in/${r.key}` : undefined,
      locked: !editable,
      tone: r.key === "SUPER_ADMIN" ? "#e34948" : SERIES_COLORS[3],
    });
  }
  (custom.data ?? []).forEach((r, i) => columns.push({ key: r.id, name: r.name, users: r.userCount, permissions: r.permissions, href: `/admin/roles/${r.id}`, tone: [SERIES_COLORS[0], SERIES_COLORS[2], SERIES_COLORS[1]][i % 3]! }));

  const loading = !builtIn.data || !custom.data;
  const staff = columns.reduce((s, c) => s + c.users, 0);
  const admins = columns.filter((c) => c.key === "SUPER_ADMIN" || c.key === "ADMIN").reduce((s, c) => s + c.users, 0);
  const has = (c: Column, p: string) => c.permissions === null || c.permissions.includes(p);
  const usage = ALL_PERMS.map((p) => ({ ...p, roles: columns.filter((c) => c.permissions !== null && has(c, p.value)).length }));
  const topPerm = [...usage].sort((a, b) => b.roles - a.roles)[0];

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Who can do what in the admin panel. Give staff a custom role with only the parts they need."
        actions={
          canManage && (
            <ButtonLink href="/admin/roles/new">
              <Plus className="size-4" aria-hidden /> New role
            </ButtonLink>
          )
        }
      />

      {(builtIn.error && !builtIn.data) || (custom.error && !custom.data) ? (
        <ErrorPanel error={(builtIn.error ?? custom.error)!} onRetry={() => (builtIn.reload(), custom.reload())} />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Figures */}
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Tile icon={Users} label="Staff accounts" value={loading ? undefined : staff} sub="with a staff role" />
            <Tile icon={Crown} label="Admins" value={loading ? undefined : admins} sub="incl. the Super Admin" />
            <Tile icon={ShieldCheck} label="Custom roles" value={custom.data?.length} sub={custom.data ? `${custom.data.reduce((s, r) => s + r.userCount, 0)} people use them` : undefined} />
            <Tile icon={KeyRound} label="Permissions" value={ALL_PERMS.length} sub={topPerm && topPerm.roles > 0 ? `Most given: ${topPerm.label}` : "Available to roles"} />
          </section>

          {/* Role cards + who has them */}
          <section className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              {loading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="glass h-32 animate-pulse rounded-2xl border" />
                  ))}
                </div>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {columns.map((c) => (
                    <li key={c.key}>
                      <RoleCard column={c} total={ALL_PERMS.length} />
                    </li>
                  ))}
                  {canManage && (
                    <li>
                      <Link
                        href="/admin/roles/new"
                        className="flex h-full min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/25 bg-white/40 text-sm font-semibold text-brand transition hover:border-brand/50 hover:bg-white/70"
                      >
                        <span className="flex size-9 items-center justify-center rounded-xl bg-brand/10">
                          <Plus className="size-5" aria-hidden />
                        </span>
                        Create a role
                      </Link>
                    </li>
                  )}
                </ul>
              )}
              {!loading && custom.data!.length === 0 && (
                <p className="mt-3 text-[13px] text-muted">No custom roles yet. For example, a &ldquo;Content Editor&rdquo; who can only write News and FAQs.</p>
              )}
            </div>
            <Card title="Staff by role">
              {loading ? <div className="h-48 animate-pulse rounded-xl bg-white/60" /> : <BarList rows={columns.map((c) => ({ key: c.key, label: c.name, value: c.users }))} empty="No staff accounts yet." />}
            </Card>
          </section>

          {/* Permission matrix */}
          {!loading && (
            <Card title="Permission matrix" actions={<span className="text-xs text-muted">✓ allowed · – not allowed</span>}>
              {columns.length === 0 ? (
                <EmptyState title="No roles" />
              ) : (
                <div className="-mx-5 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-[13px]">
                    <thead className="border-y border-line bg-white/50">
                      <tr>
                        <th scope="col" className="px-5 py-2.5 text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">
                          Permission
                        </th>
                        {columns.map((c) => (
                          <th key={c.key} scope="col" className="px-3 py-2.5 text-center">
                            {c.href ? (
                              <Link href={c.href} className="inline-flex items-center gap-1.5 text-xs font-bold text-ink hover:text-brand">
                                <span className="size-2 rounded-full" style={{ background: c.tone }} aria-hidden />
                                {c.name}
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                                <span className="size-2 rounded-full" style={{ background: c.tone }} aria-hidden />
                                {c.name}
                                <Lock className="size-3 text-subtle" aria-label="Can't be changed" />
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_GROUPS.map((g) => (
                        <GroupRows key={g.label} label={g.label} columns={columns} perms={ALL_PERMS.filter((p) => p.group === g.label)} has={has} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function GroupRows({ label, columns, perms, has }: { label: string; columns: Column[]; perms: typeof ALL_PERMS; has: (c: Column, p: string) => boolean }) {
  return (
    <>
      <tr>
        <th colSpan={columns.length + 1} scope="colgroup" className="bg-ink/[0.025] px-5 py-1.5 text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">
          {label}
        </th>
      </tr>
      {perms.map((p) => (
        <tr key={p.value} className="border-t border-line/70 transition hover:bg-brand/[0.03]">
          <th scope="row" className="px-5 py-2 font-normal">
            <span className="block font-semibold text-ink">{p.label}</span>
            <span className="block text-xs text-muted">{p.hint}</span>
          </th>
          {columns.map((c) => (
            <td key={c.key} className="px-3 py-2 text-center">
              {has(c, p.value) ? (
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-success/15 text-[#15803d]" aria-label="Allowed">
                  <Check className="size-3.5" aria-hidden />
                </span>
              ) : (
                <span className="inline-flex size-6 items-center justify-center text-subtle" aria-label="Not allowed">
                  <Minus className="size-3.5" aria-hidden />
                </span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function RoleCard({ column: c, total }: { column: Column; total: number }) {
  const count = c.permissions === null ? total : c.permissions.filter((p) => PERMISSION_LABEL[p]).length;
  const pct = Math.round((count / total) * 100);
  const body = (
    <div className={cn("glass flex h-full flex-col gap-3 rounded-2xl border p-4 transition", c.href && "hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-14px_rgba(11,31,58,0.3)]")}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: c.tone }} aria-hidden>
          {c.key === "SUPER_ADMIN" ? <Crown className="size-5" /> : <ShieldCheck className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-bold text-ink">
            <span className="truncate">{c.name}</span>
            {c.locked && <Lock className="size-3.5 shrink-0 text-subtle" aria-label="Can't be changed" />}
          </p>
          <p className="text-xs text-muted">{usersText(c.users)}</p>
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted">{c.permissions === null ? "All permissions" : `${count} of ${total} permissions`}</span>
          <span className="font-semibold text-ink tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-ink/[0.06]">
          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: c.tone }} />
        </div>
      </div>
    </div>
  );
  return c.href ? (
    <Link href={c.href} className="block h-full rounded-2xl" aria-label={`Open ${c.name}`}>
      {body}
    </Link>
  ) : (
    body
  );
}

function Tile({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: number | undefined; sub?: ReactNode }) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl border p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand" aria-hidden>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">{label}</p>
        {value === undefined ? <span className="mt-1 block h-6 w-10 animate-pulse rounded bg-white/70" /> : <p className="text-xl leading-7 font-extrabold text-ink tabular-nums">{value}</p>}
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}
