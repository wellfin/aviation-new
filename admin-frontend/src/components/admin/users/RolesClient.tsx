"use client";

import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Card, EmptyState, ErrorPanel, PageHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";
import { can, useAuth } from "@/lib/auth/auth-context";
import { useApi } from "@/lib/hooks/useApi";
import { BUILT_IN_TEXT, PERMISSION_LABEL, type BuiltInRole, type StaffRole } from "./roles";

const users = (n: number) => `${n} user${n === 1 ? "" : "s"}`;

/** Roles & permissions: every staff role (Super Admin, Admin, Manager and the custom ones) in one list. */
export function RolesClient() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useApi<StaffRole[]>("/admin/roles");
  const builtIn = useApi<BuiltInRole[]>("/admin/roles/built-in");
  const canManage = can(me, "users:manage");

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Every staff role and what it can do. Make custom roles that give staff only the parts of the admin panel they need, then give a role to people under Users."
        actions={
          canManage && (
            <ButtonLink href="/admin/roles/new" size="sm">
              <Plus className="size-4" aria-hidden /> New role
            </ButtonLink>
          )
        }
      />

      <h2 className="mb-3 text-sm font-bold tracking-[0.6px] text-muted uppercase">Built-in roles</h2>
      {builtIn.error && !builtIn.data ? (
        <ErrorPanel error={builtIn.error} onRetry={builtIn.reload} />
      ) : !builtIn.data ? (
        <div className="h-32 animate-pulse rounded-2xl bg-white" role="status" aria-label="Loading roles" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {builtIn.data.filter((r) => r.key !== "MANAGER").map((r) => {
            const editable = Boolean(me?.superAdmin) && r.editable.length > 0;
            const all = r.key === "SUPER_ADMIN" || (r.editable.length > 0 && r.editable.every((p) => r.permissions.includes(p)));
            const card = (
              <RoleCard
                name={
                  <span className="flex flex-wrap items-center gap-2">
                    {BUILT_IN_TEXT[r.key].name}
                    {!editable && <Lock className="size-3.5 text-subtle" aria-label="Built-in, can't be changed" />}
                    {r.customised && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-[#a16207]">CHANGED</span>}
                  </span>
                }
                count={r.userCount}
                description={BUILT_IN_TEXT[r.key].description}
                permissions={all ? null : r.permissions.filter((p) => PERMISSION_LABEL[p])}
                muted={!editable}
              />
            );
            return (
              <li key={r.key}>
                {editable ? (
                  <Link href={`/admin/roles/built-in/${r.key}`} className="block h-full rounded-2xl transition hover:ring-2 hover:ring-brand">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-8 mb-3 text-sm font-bold tracking-[0.6px] text-muted uppercase">Custom roles</h2>
      {error && !data ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="h-32 animate-pulse rounded-2xl bg-white" role="status" aria-label="Loading roles" />
      ) : data && data.length === 0 ? (
        <Card>
          <EmptyState
            title="No custom roles yet"
            description="For example, a “Content Editor” who can only write News and FAQs."
            action={
              canManage && (
                <ButtonLink href="/admin/roles/new" size="sm">
                  <Plus className="size-4" aria-hidden /> New role
                </ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((r) => (
            <li key={r.id}>
              <Link href={`/admin/roles/${r.id}`} className="block h-full rounded-2xl transition hover:ring-2 hover:ring-brand">
                <RoleCard name={r.name} count={r.userCount} description={r.description} permissions={r.permissions} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** `permissions` null = everything (Admin roles). */
function RoleCard({ name, count, description, permissions, muted }: { name: ReactNode; count: number; description?: string; permissions: string[] | null; muted?: boolean }) {
  return (
    <div className={`h-full rounded-2xl border border-line p-5 shadow-soft ${muted ? "bg-surface/60" : "bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-ink">{name}</p>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">{users(count)}</span>
      </div>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Permissions">
        {permissions === null ? (
          <li className="rounded-lg bg-brand/8 px-2 py-0.5 text-xs font-medium text-brand">All permissions</li>
        ) : (
          permissions.map((p) => (
            <li key={p} className="rounded-lg bg-brand/8 px-2 py-0.5 text-xs font-medium text-brand">
              {PERMISSION_LABEL[p] ?? p}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
