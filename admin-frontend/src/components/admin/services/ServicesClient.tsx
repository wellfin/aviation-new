"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Toggle } from "@/components/admin/providers/form-kit";
import { ConfirmButton, EmptyState, ErrorPanel, PageHeader, StatusPill, StatusTabs, Switch } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input, Textarea } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { fieldErrors } from "@/lib/api/forms";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { cn } from "@/lib/utils";
import { categorySchema, type AdminCategory } from "./categories";

type Feedback = { status: "success" | "error"; message: string } | null;

const FILTERS = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.body.message : "Something went wrong. Please try again.");

export function ServicesClient() {
  const { get } = useUrlParams();
  const active = get("active");
  const { data, error, loading, reload } = useApi<AdminCategory[]>(withQuery("/admin/categories", { active }));
  // Local copy so toggles and reordering update instantly; replaced whenever the server list changes.
  const [rows, setRows] = useState<AdminCategory[] | null>(null);
  const [lastData, setLastData] = useState(data);
  if (lastData !== data) {
    setLastData(data);
    setRows(data);
  }
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminCategory | "new" | null>(null);

  async function patch(c: AdminCategory, body: Partial<Pick<AdminCategory, "active" | "showInMenu">>, message: string) {
    setBusy(c.slug);
    setFeedback(null);
    try {
      const updated = await apiRequest<AdminCategory>("PATCH", `/admin/categories/${c.slug}`, body);
      setRows((rs) => rs?.map((r) => (r.slug === c.slug ? { ...r, ...updated, providerCount: r.providerCount } : r)) ?? rs);
      setFeedback({ status: "success", message });
      if (active && body.active !== undefined) reload();
    } catch (err) {
      setFeedback({ status: "error", message: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  async function move(index: number, to: number) {
    if (!rows) return;
    const previous = rows;
    const next = [...rows];
    const [it] = next.splice(index, 1);
    next.splice(to, 0, it);
    setRows(next);
    setBusy("__order");
    setFeedback(null);
    try {
      setRows(await apiRequest<AdminCategory[]>("PUT", "/admin/categories/order", { slugs: next.map((r) => r.slug) }));
    } catch (err) {
      setRows(previous);
      setFeedback({ status: "error", message: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  async function remove(c: AdminCategory) {
    setFeedback(null);
    try {
      await apiRequest("DELETE", `/admin/categories/${c.slug}`);
      setRows((rs) => rs?.filter((r) => r.slug !== c.slug) ?? rs);
      setFeedback({ status: "success", message: `“${c.name}” deleted.` });
    } catch (err) {
      setFeedback({ status: "error", message: errorMessage(err) });
    }
  }

  const canReorder = !active;

  return (
    <>
      <PageHeader
        title="Services"
        description="The service categories providers are listed under, in the order the site shows them."
        actions={
          <>
            <StatusTabs inline param="active" label="Service status" current={active} tabs={FILTERS} />
            <Button type="button" onClick={() => setEditing("new")}>
              <Plus className="size-4" /> New service
            </Button>
          </>
        }
      />

      {feedback && (
        <div className="mb-4" aria-live="polite">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}
      {!canReorder && <p className="mb-3 text-sm text-muted">Show all services to change their order.</p>}

      {error && !rows ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : !rows ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading services">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass h-[88px] animate-pulse rounded-2xl border" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-2xl border">
          <EmptyState title="No services here" description={active ? "Try another filter." : "Create the first service category."} />
        </div>
      ) : (
        <ol className={cn("flex flex-col gap-2", loading && "opacity-60")} aria-busy={loading || busy === "__order" || undefined}>
          {rows.map((c, i) => (
            <li
              key={c.slug}
              className={cn(
                "glass group flex flex-col gap-3 rounded-2xl border px-4 py-2 transition hover:-translate-y-px hover:shadow-[0_12px_32px_-14px_rgba(11,31,58,0.28)] xl:flex-row xl:items-center xl:gap-5",
                !c.active && "opacity-75",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {canReorder && (
                  <div className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-white/70">
                    <button type="button" aria-label={`Move ${c.name} up`} disabled={i === 0 || busy !== null} onClick={() => move(i, i - 1)} className="flex h-5 w-7 items-center justify-center text-muted transition hover:bg-brand/10 hover:text-brand disabled:opacity-30 disabled:hover:bg-transparent">
                      <ArrowUp className="size-3.5" />
                    </button>
                    <span className="h-px bg-line" aria-hidden />
                    <button type="button" aria-label={`Move ${c.name} down`} disabled={i === rows.length - 1 || busy !== null} onClick={() => move(i, i + 1)} className="flex h-5 w-7 items-center justify-center text-muted transition hover:bg-brand/10 hover:text-brand disabled:opacity-30 disabled:hover:bg-transparent">
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                )}
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/15 to-brand-cyan/10 text-xl ring-1 ring-brand/10" aria-hidden>
                  {c.emoji || "•"}
                </span>
                <div className="min-w-0" title={`${c.longName} · icon: ${c.icon}`}>
                  <p className="flex flex-wrap items-center gap-2 leading-5">
                    <span className="text-[14px] font-bold text-ink">{c.name}</span>
                    <code className="rounded bg-ink/[0.05] px-1.5 py-px font-mono text-[11px] text-muted">/{c.slug}</code>
                    <span className="rounded-md bg-brand/10 px-1.5 py-px text-[11px] font-semibold text-brand">
                      {c.providerCount} listing{c.providerCount === 1 ? "" : "s"}
                    </span>
                    {!c.active && <StatusPill status="inactive" tone="slate" />}
                  </p>
                  <p className="truncate text-[13px] leading-5 text-muted">{c.description || c.longName}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line pt-2.5 xl:shrink-0 xl:justify-end xl:border-t-0 xl:pt-0">
                <div className="flex items-center gap-4 rounded-xl border border-line bg-white/60 px-3 py-1">
                  <Switch
                    label="Active"
                    checked={c.active}
                    disabled={busy !== null}
                    onChange={(v) => patch(c, { active: v }, v ? `“${c.name}” is active.` : `“${c.name}” deactivated.`)}
                  />
                  <span className="h-6 w-px bg-line" aria-hidden />
                  <Switch
                    label="In menu"
                    checked={c.showInMenu}
                    disabled={busy !== null}
                    onChange={(v) => patch(c, { showInMenu: v }, v ? `“${c.name}” is shown in the menu.` : `“${c.name}” hidden from the menu.`)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    title="Edit"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white/80 px-3 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
                  >
                    <Pencil className="size-4" /> Edit
                  </button>
                  <ConfirmButton confirmLabel="Delete" onConfirm={() => remove(c)}>
                    <span className="inline-flex items-center gap-1.5">
                      <Trash2 className="size-4" aria-hidden />
                      <span className="sr-only">Delete {c.name}</span>
                    </span>
                  </ConfirmButton>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <CategoryDialog
        category={editing}
        nextOrder={((rows ?? []).reduce((m, r) => Math.max(m, r.order), 0) || 0) + 10}
        onClose={() => setEditing(null)}
        onSaved={(saved, created) => {
          setFeedback({ status: "success", message: created ? `“${saved.name}” created.` : `“${saved.name}” saved.` });
          reload();
        }}
      />
    </>
  );
}

interface DraftState {
  slug: string;
  name: string;
  longName: string;
  description: string;
  icon: string;
  emoji: string;
  order: string;
  active: boolean;
  showInMenu: boolean;
}

function draftFrom(c: AdminCategory | "new" | null, nextOrder: number): DraftState {
  if (c && c !== "new") return { ...c, order: String(c.order) };
  return { slug: "", name: "", longName: "", description: "", icon: "plane", emoji: "✈️", order: String(nextOrder), active: true, showInMenu: true };
}

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Create / edit dialog (native <dialog>: focus is trapped and restored). */
function CategoryDialog({
  category,
  nextOrder,
  onClose,
  onSaved,
}: {
  category: AdminCategory | "new" | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (saved: AdminCategory, created: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const isNew = category === "new";
  const [d, setD] = useState<DraftState>(() => draftFrom(category, nextOrder));
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [lastCategory, setLastCategory] = useState(category);
  if (lastCategory !== category) {
    setLastCategory(category);
    setD(draftFrom(category, nextOrder));
    setSlugTouched(false);
    setErrors({});
    setFormError("");
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (category && !el.open) el.showModal();
    if (!category && el.open) el.close();
  }, [category]);

  const upd = (patch: Partial<DraftState>) => setD((prev) => ({ ...prev, ...patch }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const order = d.order.trim() === "" ? Number.NaN : Number(d.order);
    const parsed = categorySchema.safeParse({ ...d, order });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFormError("");
    setSaving(true);
    try {
      const { slug, ...fields } = parsed.data;
      const saved = isNew
        ? await apiRequest<AdminCategory>("POST", "/admin/categories", parsed.data)
        : await apiRequest<AdminCategory>("PATCH", `/admin/categories/${slug}`, fields);
      onSaved(saved, isNew);
      ref.current?.close();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body.fieldErrors) setErrors(err.body.fieldErrors);
        setFormError(err.body.message);
      } else setFormError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={ref} aria-labelledby="category-dialog-title" onClose={onClose} className="m-auto w-[calc(100%-32px)] max-w-xl rounded-2xl p-0 shadow-card backdrop:bg-navy-950/50">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-6">
        <h2 id="category-dialog-title" className="text-lg font-bold text-ink">
          {isNew ? "New service" : `Edit “${category ? category.name : ""}”`}
        </h2>
        {formError && <FormStatus status="error" message={formError} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name *"
            name="cat-name"
            value={d.name}
            maxLength={60}
            onChange={(e) => upd({ name: e.target.value, ...(isNew && !slugTouched ? { slug: slugify(e.target.value) } : {}) })}
            error={errors.name}
          />
          <Input
            label="Slug *"
            name="cat-slug"
            value={d.slug}
            maxLength={60}
            disabled={!isNew}
            onChange={(e) => {
              setSlugTouched(true);
              upd({ slug: e.target.value.toLowerCase() });
            }}
            error={errors.slug}
            hint={isNew ? "Used in URLs; can't be changed later." : "The slug can't be changed."}
            className="font-mono"
          />
        </div>
        <Input label="Long name *" name="cat-longName" value={d.longName} maxLength={100} placeholder="Fixed Base Operator" onChange={(e) => upd({ longName: e.target.value })} error={errors.longName} />
        <Textarea label="Description" name="cat-description" value={d.description} maxLength={500} onChange={(e) => upd({ description: e.target.value })} error={errors.description} className="min-h-20" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Icon" name="cat-icon" value={d.icon} maxLength={40} placeholder="fuel" onChange={(e) => upd({ icon: e.target.value.toLowerCase() })} error={errors.icon} hint="lucide icon name" />
          <Input label="Emoji" name="cat-emoji" value={d.emoji} maxLength={8} onChange={(e) => upd({ emoji: e.target.value })} error={errors.emoji} />
          <Input label="Order" name="cat-order" type="number" min={0} max={10000} value={d.order} onChange={(e) => upd({ order: e.target.value })} error={errors.order} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle id="cat-active" label="Active" description="Available to listings and search." checked={d.active} onChange={(v) => upd({ active: v })} />
          <Toggle id="cat-menu" label="Show in menu" description="Listed in the site's services menu." checked={d.showInMenu} onChange={(v) => upd({ showInMenu: v })} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => ref.current?.close()} className="h-11 rounded-xl border border-line px-4 text-sm font-semibold text-muted hover:bg-surface">
            Cancel
          </button>
          <Button type="submit" loading={saving}>
            {isNew ? "Create service" : "Save changes"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
