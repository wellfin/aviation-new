"use client";

import Link from "next/link";
import { ArrowLeft, Crown, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ConfirmButton, ErrorPanel } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useApi } from "@/lib/hooks/useApi";
import { PermissionBoard, PermissionSummary } from "./PermissionBoard";
import { BUILT_IN_TEXT, PERMISSION_GROUPS, USERS_MANAGE_ITEM, type BuiltInRole } from "./roles";

type Feedback = { status: "success" | "error"; message: string } | null;

/** Super Admin: choose what the built-in Admin or Manager (standard) role can do. */
export function BuiltInRoleEditor({ roleKey }: { roleKey: "ADMIN" | "MANAGER" }) {
  const { data, error, reload } = useApi<BuiltInRole[]>("/admin/roles/built-in");
  const role = data?.find((r) => r.key === roleKey);
  const back = (
    <Link href="/admin/roles" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
      <ArrowLeft className="size-4" /> Roles & permissions
    </Link>
  );
  if (error && !data) {
    return (
      <>
        {back}
        <ErrorPanel error={error} onRetry={reload} />
      </>
    );
  }
  if (!role) {
    return (
      <>
        {back}
        <div className="h-64 animate-pulse rounded-2xl bg-white/60" role="status" aria-label="Loading role" />
      </>
    );
  }
  return <Form key={role.permissions.join()} role={role} back={back} onSaved={reload} />;
}

function Form({ role, back, onSaved }: { role: BuiltInRole; back: React.ReactNode; onSaved: () => void }) {
  const { user: me } = useAuth();
  const canEdit = Boolean(me?.superAdmin);
  const [perms, setPerms] = useState<Set<string>>(new Set(role.permissions));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const text = BUILT_IN_TEXT[role.key];

  const groups = PERMISSION_GROUPS.map((g) => ({
    ...g,
    items: [...g.items, ...(g.label === "Customers" && role.editable.includes(USERS_MANAGE_ITEM.value) ? [USERS_MANAGE_ITEM] : [])].filter((i) => role.editable.includes(i.value)),
  })).filter((g) => g.items.length > 0);

  async function save(permissions: string[] | null) {
    setFeedback(null);
    setSaving(true);
    try {
      await apiRequest("PUT", `/admin/roles/built-in/${role.key}`, { permissions });
      setFeedback({ status: "success", message: permissions ? "Saved. Everyone with this role gets the new permissions straight away." : "Back to the default permissions." });
      onSaved();
    } catch (err) {
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Something went wrong. Please try again." });
    }
    setSaving(false);
  }

  const count = groups.reduce((n, g) => n + g.items.filter((i) => perms.has(i.value)).length, 0);
  const toggle = (values: string[], on: boolean) =>
    setPerms((cur) => {
      const next = new Set(cur);
      for (const v of values) {
        if (on) next.add(v);
        else next.delete(v);
      }
      return next;
    });

  return (
    <>
      {back}
      <RoleHero
        icon={Crown}
        tone="#eda100"
        name={text.name}
        subtitle={`${role.userCount} user${role.userCount === 1 ? "" : "s"} · ${text.description}`}
        badges={
          <>
            <span className="rounded-md bg-ink/[0.06] px-2 py-0.5 text-[11px] font-bold text-muted">BUILT-IN</span>
            {role.customised && <span className="rounded-md bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-[#a16207]">CHANGED</span>}
          </>
        }
      />
      {feedback && (
        <div className="mb-4">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}
      {!canEdit && <p className="mb-4 rounded-xl border border-line bg-white/70 px-4 py-3 text-sm text-muted">Only the Super Admin can change this role. You can view it.</p>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <PermissionBoard groups={groups} selected={perms} onToggle={toggle} disabled={!canEdit || saving} />
          <p className="mt-3 text-xs text-subtle">The Super Admin always keeps every permission. Sign-in, profile and file uploads stay on for everyone with this role.</p>
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          {canEdit && (
            <div className="glass flex flex-col gap-2 rounded-2xl border p-4">
              <Button type="button" loading={saving} onClick={() => save([...perms])} className="w-full">
                Save role
              </Button>
              <p className="text-center text-xs text-muted">Changes apply to everyone with this role straight away.</p>
            </div>
          )}
          <PermissionSummary groups={groups} selected={perms} disabled={!canEdit || saving} onAll={(on) => toggle(groups.flatMap((g) => g.items.map((i) => i.value)), on)} />
          {canEdit && role.customised && (
            <div className="glass rounded-2xl border p-4">
              <p className="mb-1 text-sm font-semibold text-ink">Defaults</p>
              <p className="mb-3 text-xs text-muted">Undo every change and give this role its original permissions.</p>
              <ConfirmButton tone="primary" confirmLabel="Reset" onConfirm={() => save(null)}>
                Reset to default
              </ConfirmButton>
            </div>
          )}
          {count === 0 && <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-[#a16207]">With nothing allowed, people with this role can only sign in.</p>}
        </aside>
      </div>
    </>
  );
}

function RoleHero({ icon: Icon, tone, name, subtitle, badges }: { icon: LucideIcon; tone: string; name: string; subtitle: string; badges?: React.ReactNode }) {
  return (
    <div className="glass mb-4 flex flex-col gap-4 overflow-hidden rounded-2xl border p-5 sm:flex-row sm:items-center">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-10px_rgba(11,31,58,0.45)]" style={{ background: tone }} aria-hidden>
        <Icon className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="flex flex-wrap items-center gap-2 text-[22px] leading-7 font-extrabold text-ink">
          {name}
          {badges}
        </h1>
        <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
