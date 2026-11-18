"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Card, ConfirmButton, ErrorPanel, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useApi } from "@/lib/hooks/useApi";
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
        <div className="h-64 animate-pulse rounded-2xl bg-white" role="status" aria-label="Loading role" />
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

  return (
    <>
      {back}
      <PageHeader title={text.name} description={`${role.userCount} user${role.userCount === 1 ? "" : "s"} have this role. ${text.description}`} />
      {feedback && (
        <div className="mb-4">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}
      {!canEdit && <p className="mb-4 rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted">Only the Super Admin can change this role. You can view it.</p>}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        <fieldset disabled={!canEdit || saving} className="min-w-0">
          <Card title="Permissions">
            <div className="flex flex-col gap-5">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="mb-2 text-xs font-semibold tracking-[0.6px] text-muted uppercase">{g.label}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.items.map((p) => (
                      <label key={p.value} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 text-sm has-checked:border-brand has-checked:bg-brand/5">
                        <input
                          type="checkbox"
                          checked={perms.has(p.value)}
                          onChange={(e) =>
                            setPerms((s) => {
                              const next = new Set(s);
                              if (e.target.checked) next.add(p.value);
                              else next.delete(p.value);
                              return next;
                            })
                          }
                          className="mt-0.5 size-4 accent-brand"
                        />
                        <span>
                          <span className="block font-semibold text-ink">{p.label}</span>
                          <span className="block text-xs text-muted">{p.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-subtle">The Super Admin always keeps every permission. Sign-in, profile and file uploads stay on for everyone with this role.</p>
            </div>
          </Card>
        </fieldset>
        {canEdit && (
          <aside className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft lg:sticky lg:top-24">
            <Button type="button" loading={saving} onClick={() => save([...perms])} className="w-full">
              Save role
            </Button>
            <p className="text-xs text-muted">
              {perms.size} of {role.editable.length} permissions selected.
            </p>
            {role.customised && (
              <div className="border-t border-line pt-3">
                <ConfirmButton tone="primary" confirmLabel="Reset" onConfirm={() => save(null)}>
                  Reset to default
                </ConfirmButton>
              </div>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
