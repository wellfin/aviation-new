"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Card, ConfirmButton, EmptyState, ErrorPanel, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input, Textarea } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { can, useAuth } from "@/lib/auth/auth-context";
import { useApi } from "@/lib/hooks/useApi";
import { PERMISSION_GROUPS, type StaffRole } from "./roles";

type Feedback = { status: "success" | "error"; message: string } | null;

/** Loads a role (edit) or starts blank (new). */
export function RoleEditor({ id }: { id?: string }) {
  const { data, error, reload } = useApi<StaffRole>(id ? `/admin/roles/${id}` : null);
  const back = (
    <Link href="/admin/roles" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
      <ArrowLeft className="size-4" /> Roles & permissions
    </Link>
  );
  if (!id) return <RoleForm initial={null} back={back} />;
  if (error && !data) {
    return (
      <>
        {back}
        {error.status === 404 ? <EmptyState title="Role not found" description="It may have been deleted." /> : <ErrorPanel error={error} onRetry={reload} />}
      </>
    );
  }
  if (!data) {
    return (
      <>
        {back}
        <div className="h-64 animate-pulse rounded-2xl bg-white" role="status" aria-label="Loading role" />
      </>
    );
  }
  return <RoleForm key={data.id} initial={data} back={back} />;
}

function RoleForm({ initial, back }: { initial: StaffRole | null; back: React.ReactNode }) {
  const router = useRouter();
  const { user: me } = useAuth();
  const canManage = can(me, "users:manage");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [perms, setPerms] = useState<Set<string>>(new Set(initial?.permissions ?? []));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (p: string, on: boolean) =>
    setPerms((s) => {
      const next = new Set(s);
      if (on) next.add(p);
      else next.delete(p);
      return next;
    });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = "Enter at least 2 characters";
    if (perms.size === 0) found.permissions = "Choose at least one permission";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    const body = { name: name.trim(), description: description.trim(), permissions: [...perms] };
    try {
      if (initial) {
        await apiRequest("PATCH", `/admin/roles/${initial.id}`, body);
        setFeedback({ status: "success", message: "Role saved. People with this role get the new permissions straight away." });
      } else {
        const created = await apiRequest<StaffRole>("POST", "/admin/roles", body);
        router.replace(`/admin/roles/${created.id}`);
        return;
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body.fieldErrors) setErrors(err.body.fieldErrors);
        setFeedback({ status: "error", message: err.body.message });
      } else setFeedback({ status: "error", message: "Something went wrong. Please try again." });
    }
    setSaving(false);
  }

  async function remove() {
    if (!initial) return;
    setFeedback(null);
    try {
      await apiRequest("DELETE", `/admin/roles/${initial.id}`);
      router.push("/admin/roles");
    } catch (err) {
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't delete this role." });
    }
  }

  return (
    <>
      {back}
      <PageHeader
        title={initial ? initial.name : "New role"}
        description={initial ? `${initial.userCount} user${initial.userCount === 1 ? "" : "s"} have this role.` : "Name the role and tick what people with it can do."}
      />
      {feedback && (
        <div className="mb-4">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}
      {!canManage && <p className="mb-4 rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted">Only Admins can change roles. You can view this one.</p>}

      <form onSubmit={submit} noValidate className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        <fieldset disabled={!canManage || saving} className="flex min-w-0 flex-col gap-4">
          <Card title="Role">
            <div className="flex flex-col gap-4">
              <Input label="Role name *" name="name" value={name} maxLength={60} placeholder="Content Editor" onChange={(e) => setName(e.target.value)} error={errors.name} />
              <Textarea label="Description" name="description" value={description} maxLength={200} placeholder="Writes News and FAQs." onChange={(e) => setDescription(e.target.value)} error={errors.description} className="min-h-20" />
            </div>
          </Card>
          <Card title="Permissions">
            <div className="flex flex-col gap-5">
              {PERMISSION_GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="mb-2 text-xs font-semibold tracking-[0.6px] text-muted uppercase">{g.label}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.items.map((p) => (
                      <label key={p.value} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 text-sm has-checked:border-brand has-checked:bg-brand/5">
                        <input type="checkbox" checked={perms.has(p.value)} onChange={(e) => toggle(p.value, e.target.checked)} className="mt-0.5 size-4 accent-brand" />
                        <span>
                          <span className="block font-semibold text-ink">{p.label}</span>
                          <span className="block text-xs text-muted">{p.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {errors.permissions && <p className="text-xs font-medium text-danger">{errors.permissions}</p>}
              <p className="text-xs text-subtle">Adding users and editing roles always stay with Admins. File uploads are included automatically.</p>
            </div>
          </Card>
        </fieldset>
        {canManage && (
          <aside className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft lg:sticky lg:top-24">
            <Button type="submit" loading={saving} className="w-full">
              {initial ? "Save role" : "Create role"}
            </Button>
            <p className="text-xs text-muted">{perms.size} permission{perms.size === 1 ? "" : "s"} selected.</p>
            {initial && (
              <div className="border-t border-line pt-3">
                <ConfirmButton confirmLabel="Delete role" onConfirm={remove}>
                  Delete role
                </ConfirmButton>
                {initial.userCount > 0 && <p className="mt-2 text-xs text-muted">Give its {initial.userCount} user{initial.userCount === 1 ? "" : "s"} another role first.</p>}
              </div>
            )}
          </aside>
        )}
      </form>
    </>
  );
}
