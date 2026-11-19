"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, IdCard, ShieldCheck, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ConfirmButton, EmptyState, ErrorPanel } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { can, useAuth } from "@/lib/auth/auth-context";
import { useApi } from "@/lib/hooks/useApi";
import { PermissionBoard, PermissionSummary } from "./PermissionBoard";
import { PERMISSION_GROUPS, type StaffRole } from "./roles";

type Feedback = { status: "success" | "error"; message: string } | null;

/** Loads a role (edit) or starts blank (new). */
export function RoleEditor({ id }: { id?: string }) {
  const { data, error, reload } = useApi<StaffRole>(
    id ? `/admin/roles/${id}` : null,
  );
  const back = (
    <Link
      href="/admin/roles"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand"
    >
      <ArrowLeft className="size-4" /> Roles & permissions
    </Link>
  );
  if (!id) return <RoleForm initial={null} back={back} />;
  if (error && !data) {
    return (
      <>
        {back}
        {error.status === 404 ? (
          <EmptyState
            title="Role not found"
            description="It may have been deleted."
          />
        ) : (
          <ErrorPanel error={error} onRetry={reload} />
        )}
      </>
    );
  }
  if (!data) {
    return (
      <>
        {back}
        <div
          className="h-64 animate-pulse rounded-2xl bg-white/60"
          role="status"
          aria-label="Loading role"
        />
      </>
    );
  }
  return <RoleForm key={data.id} initial={data} back={back} />;
}

function RoleForm({
  initial,
  back,
}: {
  initial: StaffRole | null;
  back: React.ReactNode;
}) {
  const router = useRouter();
  const { user: me } = useAuth();
  const canManage = can(me, "users:manage");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [perms, setPerms] = useState<Set<string>>(
    new Set(initial?.permissions ?? []),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = "Enter at least 2 characters";
    if (perms.size === 0) found.permissions = "Choose at least one permission";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim(),
      permissions: [...perms],
    };
    try {
      if (initial) {
        await apiRequest("PATCH", `/admin/roles/${initial.id}`, body);
        setFeedback({
          status: "success",
          message:
            "Role saved. People with this role get the new permissions straight away.",
        });
      } else {
        const created = await apiRequest<StaffRole>(
          "POST",
          "/admin/roles",
          body,
        );
        router.replace(`/admin/roles/${created.id}`);
        return;
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body.fieldErrors) setErrors(err.body.fieldErrors);
        setFeedback({ status: "error", message: err.body.message });
      } else
        setFeedback({
          status: "error",
          message: "Something went wrong. Please try again.",
        });
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
      setFeedback({
        status: "error",
        message:
          err instanceof ApiError
            ? err.body.message
            : "Couldn't delete this role.",
      });
    }
  }

  const bulk = (values: string[], on: boolean) =>
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
      <div data-editor-chrome>{back}</div>
      <div data-editor-chrome>
        <RoleHero
          icon={ShieldCheck}
          tone="#2a78d6"
          name={initial ? initial.name : name.trim() || "New role"}
          subtitle={
            initial
              ? `${initial.userCount} user${initial.userCount === 1 ? "" : "s"} · ${initial.description || "Custom role"}`
              : "Name the role and switch on what people with it can do."
          }
          badges={
            <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
              CUSTOM
            </span>
          }
        />
      </div>
      {feedback && (
        <div className="mb-4">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}
      {!canManage && (
        <p className="mb-4 rounded-xl border border-line bg-white/70 px-4 py-3 text-sm text-muted">
          Only Admins can change roles. You can view this one.
        </p>
      )}

      <form
        onSubmit={submit}
        noValidate
        className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <fieldset
          disabled={!canManage || saving}
          className="flex min-w-0 flex-col gap-4"
        >
          <section className="glass rounded-2xl border">
            <header className="flex items-center gap-3 border-b border-line/80 px-5 py-3.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/15 to-brand-cyan/10 text-brand ring-1 ring-brand/10"
                aria-hidden
              >
                <IdCard className="size-[18px]" />
              </span>
              <div>
                <h3 className="text-[15px] font-bold text-ink">Role details</h3>
                <p className="text-xs text-muted">
                  Shown in the role list and when you give someone this role.
                </p>
              </div>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Input
                label="Role name *"
                name="name"
                value={name}
                maxLength={60}
                placeholder="Content Editor"
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />
              <Input
                label="Description"
                name="description"
                value={description}
                maxLength={200}
                placeholder="Writes News and FAQs."
                onChange={(e) => setDescription(e.target.value)}
                error={errors.description}
              />
            </div>
          </section>
          <PermissionBoard
            groups={PERMISSION_GROUPS}
            selected={perms}
            onToggle={bulk}
            disabled={!canManage || saving}
          />
          {errors.permissions && (
            <p className="text-xs font-medium text-danger">
              {errors.permissions}
            </p>
          )}
          <p className="text-xs text-subtle">
            Adding users and editing roles always stay with Admins. File uploads
            are included automatically.
          </p>
        </fieldset>
        <aside data-sticky className="flex flex-col gap-4 lg:sticky lg:top-24">
          {canManage && (
            <div className="glass flex flex-col gap-2 rounded-2xl border p-4">
              <Button type="submit" loading={saving} className="w-full">
                {initial ? "Save role" : "Create role"}
              </Button>
              <p className="text-center text-xs text-muted">
                {initial
                  ? "Changes apply to its people straight away."
                  : "You can give it to people under Users."}
              </p>
            </div>
          )}
          <PermissionSummary
            groups={PERMISSION_GROUPS}
            selected={perms}
            disabled={!canManage || saving}
            onAll={(on) =>
              bulk(
                PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.value)),
                on,
              )
            }
          />
          {canManage && initial && (
            <div className="glass rounded-2xl border p-4">
              <p className="mb-1 text-sm font-semibold text-ink">Delete role</p>
              <p className="mb-3 text-xs text-muted">
                {initial.userCount > 0
                  ? `Give its ${initial.userCount} user${initial.userCount === 1 ? "" : "s"} another role first.`
                  : "No one has this role, so it can be deleted."}
              </p>
              <ConfirmButton
                confirmLabel="Delete role"
                onConfirm={remove}
                disabled={initial.userCount > 0}
              >
                Delete role
              </ConfirmButton>
            </div>
          )}
        </aside>
      </form>
    </>
  );
}

function RoleHero({
  icon: Icon,
  tone,
  name,
  subtitle,
  badges,
}: {
  icon: LucideIcon;
  tone: string;
  name: string;
  subtitle: string;
  badges?: React.ReactNode;
}) {
  return (
    <div className="glass mb-4 flex flex-col gap-4 overflow-hidden rounded-2xl border p-5 sm:flex-row sm:items-center">
      <span
        className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-10px_rgba(11,31,58,0.45)]"
        style={{ background: tone }}
        aria-hidden
      >
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
