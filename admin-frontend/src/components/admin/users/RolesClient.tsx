"use client";

import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import { Card, EmptyState, ErrorPanel, PageHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";
import { can, useAuth } from "@/lib/auth/auth-context";
import { useApi } from "@/lib/hooks/useApi";
import { PERMISSION_LABEL, type StaffRole } from "./roles";
import { ROLE_DESCRIPTION } from "./shared";

/** Roles & permissions: the fixed Admin and Manager roles, plus the custom staff roles. */
export function RolesClient() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useApi<StaffRole[]>("/admin/roles");
  const canManage = can(me, "users:manage");

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Make roles that give staff only the parts of the admin panel they need, then give a role to people under Users."
        actions={
          canManage && (
            <ButtonLink href="/admin/roles/new" size="sm">
              <Plus className="size-4" aria-hidden /> New role
            </ButtonLink>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <BuiltIn name="Admin" description={ROLE_DESCRIPTION.ADMIN} />
        <BuiltIn name="Manager (standard)" description={ROLE_DESCRIPTION.MANAGER} />
      </div>

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
        <ul className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((r) => (
            <li key={r.id}>
              <Link href={`/admin/roles/${r.id}`} className="block h-full rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:border-brand">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-ink">{r.name}</p>
                  <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">
                    {r.userCount} user{r.userCount === 1 ? "" : "s"}
                  </span>
                </div>
                {r.description && <p className="mt-1 text-sm text-muted">{r.description}</p>}
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Permissions">
                  {r.permissions.map((p) => (
                    <li key={p} className="rounded-lg bg-brand/8 px-2 py-0.5 text-xs font-medium text-brand">
                      {PERMISSION_LABEL[p] ?? p}
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function BuiltIn({ name, description }: { name: string; description: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-5">
      <p className="flex items-center gap-2 font-bold text-ink">
        {name} <Lock className="size-3.5 text-subtle" aria-label="Built-in, can't be changed" />
      </p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
