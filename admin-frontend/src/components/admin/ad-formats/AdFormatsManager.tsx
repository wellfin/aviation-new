"use client";

import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Card, ConfirmButton, EmptyState, ErrorPanel, PageHeader, StatusPill } from "@/components/admin/ui";
import { siteUrl } from "@/components/admin/news/site";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input, Textarea } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { fieldErrors, type FieldErrors } from "@/lib/api/forms";
import { useApi } from "@/lib/hooks/useApi";
import { cn, slugify } from "@/lib/utils";
import { adFormatFormSchema, type AdFormat, type AdFormatFormValues } from "./schema";

type Feedback = { status: "success" | "error"; message: string } | null;
const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.body.message : fallback);

export function AdFormatsManager() {
  const { data, error, loading, reload } = useApi<AdFormat[]>("/admin/ad-formats");
  const [list, setList] = useState<AdFormat[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Local edits win over the fetched list until the next reload.
  const [lastData, setLastData] = useState(data);
  if (lastData !== data) {
    setLastData(data);
    setList(null);
  }
  const formats = list ?? data ?? [];

  async function move(index: number, dir: -1 | 1) {
    const previous = formats;
    const next = [...formats];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    setList(next);
    setBusy(next[index + dir].id);
    setFeedback(null);
    try {
      setList(await apiRequest<AdFormat[]>("PUT", "/admin/ad-formats/order", { keys: next.map((f) => f.id) }));
    } catch (err) {
      setList(previous);
      setFeedback({ status: "error", message: message(err, "Couldn't save the new order.") });
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive(f: AdFormat) {
    setBusy(f.id);
    setFeedback(null);
    try {
      const updated = await apiRequest<AdFormat>("PATCH", `/admin/ad-formats/${f.id}`, { active: !f.active });
      setList(formats.map((x) => (x.id === f.id ? updated : x)));
      setFeedback({ status: "success", message: updated.active ? `"${updated.title}" is shown on the Advertise page.` : `"${updated.title}" is hidden from the Advertise page.` });
    } catch (err) {
      setFeedback({ status: "error", message: message(err, "Couldn't update the package.") });
    } finally {
      setBusy(null);
    }
  }

  async function remove(f: AdFormat) {
    setFeedback(null);
    try {
      await apiRequest("DELETE", `/admin/ad-formats/${f.id}`);
      setList(formats.filter((x) => x.id !== f.id));
      setFeedback({ status: "success", message: `Deleted "${f.title}".` });
    } catch (err) {
      setFeedback({ status: "error", message: message(err, "Couldn't delete the package.") });
    }
  }

  return (
    <>
      <PageHeader
        title="Ad packages"
        description="Advertising products listed on the public Advertise page. Only active packages are shown, in this order."
        actions={
          <>
            <a href={siteUrl("/advertise")} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand hover:bg-brand/5">
              View page <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <Button size="sm" onClick={() => setCreating(true)} disabled={creating}>
              <Plus className="size-4" aria-hidden /> New package
            </Button>
          </>
        }
      />

      {feedback && (
        <div className="mb-4" aria-live="polite">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}

      {creating && (
        <Card title="New package" className="mb-6">
          <AdFormatForm
            initial={{ key: "", icon: "📣", title: "", description: "", priceLabel: "", active: true }}
            isNew
            submitLabel="Create package"
            onCancel={() => setCreating(false)}
            onSubmit={async (v) => {
              const created = await apiRequest<AdFormat>("POST", "/admin/ad-formats", v);
              setList([...formats, created].sort((a, b) => a.order - b.order));
              setCreating(false);
              setFeedback({ status: "success", message: `Created "${created.title}".` });
            }}
          />
        </Card>
      )}

      {error && !data ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="h-72 animate-pulse rounded-2xl bg-white shadow-soft" role="status" aria-label="Loading ad packages" />
      ) : formats.length === 0 ? (
        <Card>
          <EmptyState title="No ad packages yet" description="Add the first product for the Advertise page." />
        </Card>
      ) : (
        <Card>
          <ol className="divide-y divide-line">
            {formats.map((f, i) => (
              <li key={f.id} className="py-4 first:pt-0 last:pb-0">
                {editing === f.id ? (
                  <AdFormatForm
                    initial={{ key: f.id, icon: f.icon, title: f.title, description: f.description, priceLabel: f.priceLabel, active: f.active }}
                    submitLabel="Save changes"
                    onCancel={() => setEditing(null)}
                    onSubmit={async (v) => {
                      const body = { icon: v.icon, title: v.title, description: v.description, priceLabel: v.priceLabel, active: v.active };
                      const updated = await apiRequest<AdFormat>("PATCH", `/admin/ad-formats/${f.id}`, body);
                      setList(formats.map((x) => (x.id === f.id ? updated : x)));
                      setEditing(null);
                      setFeedback({ status: "success", message: `Saved "${updated.title}".` });
                    }}
                  />
                ) : (
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="flex shrink-0 gap-1.5 md:flex-col">
                      <OrderButton label={`Move "${f.title}" up`} disabled={i === 0 || busy !== null} onClick={() => move(i, -1)}>
                        <ArrowUp className="size-4" />
                      </OrderButton>
                      <OrderButton label={`Move "${f.title}" down`} disabled={i === formats.length - 1 || busy !== null} onClick={() => move(i, 1)}>
                        <ArrowDown className="size-4" />
                      </OrderButton>
                    </div>
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-2xl" aria-hidden>
                      {f.icon || "📣"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">
                        {f.title} <span className="ml-1 font-mono text-xs font-normal text-subtle">{f.id}</span>
                      </p>
                      <p className="mt-1 text-sm text-muted">{f.description}</p>
                      {f.priceLabel && <p className="mt-1 text-sm font-semibold text-brand">{f.priceLabel}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <StatusPill status={f.active ? "active" : "hidden"} tone={f.active ? "green" : "slate"} />
                      <button
                        type="button"
                        role="switch"
                        aria-checked={f.active}
                        aria-label={`Show "${f.title}" on the Advertise page`}
                        disabled={busy !== null}
                        onClick={() => toggleActive(f)}
                        className={cn("relative h-6 w-11 rounded-full transition disabled:opacity-50", f.active ? "bg-success" : "bg-slate-300")}
                      >
                        <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition", f.active && "translate-x-5")} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(f.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:bg-surface"
                      >
                        <Pencil className="size-3.5" aria-hidden /> Edit
                      </button>
                      <ConfirmButton onConfirm={() => remove(f)} confirmLabel="Delete">
                        Delete
                      </ConfirmButton>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </>
  );
}

function OrderButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg border border-line bg-white text-muted transition hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function AdFormatForm({
  initial,
  isNew = false,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: AdFormatFormValues;
  isNew?: boolean;
  submitLabel: string;
  onSubmit: (values: AdFormatFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [keyTouched, setKeyTouched] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const idp = isNew ? "fmt-new" : `fmt-${initial.key}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = adFormatFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      if (err instanceof ApiError && err.body.fieldErrors) setErrors(err.body.fieldErrors);
      setFormError(message(err, "Couldn't save the package."));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[96px_minmax(0,1fr)]">
        <Input id={`${idp}-icon`} name="icon" label="Icon" value={values.icon} maxLength={8} onChange={(e) => setValues({ ...values, icon: e.target.value })} error={errors.icon} className="text-center text-xl" />
        <Input
          id={`${idp}-title`}
          name="title"
          label="Title"
          value={values.title}
          maxLength={80}
          autoFocus
          onChange={(e) => {
            const title = e.target.value;
            setValues((v) => ({ ...v, title, key: isNew && !keyTouched ? slugify(title).slice(0, 60) : v.key }));
          }}
          error={errors.title}
        />
      </div>
      <Textarea id={`${idp}-description`} name="description" label="Description" value={values.description} maxLength={300} onChange={(e) => setValues({ ...values, description: e.target.value })} error={errors.description} className="min-h-[88px]" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id={`${idp}-priceLabel`}
          name="priceLabel"
          label="Price label (optional)"
          value={values.priceLabel}
          maxLength={60}
          placeholder="From ₹25,000 / month"
          onChange={(e) => setValues({ ...values, priceLabel: e.target.value })}
          error={errors.priceLabel}
        />
        <Input
          id={`${idp}-key`}
          name="key"
          label="Id"
          value={values.key}
          maxLength={60}
          disabled={!isNew}
          onChange={(e) => {
            setKeyTouched(true);
            setValues({ ...values, key: e.target.value.toLowerCase() });
          }}
          error={errors.key}
          hint={isNew ? "Lowercase letters, numbers and dashes. Can't be changed later." : "The id can't be changed."}
          className="font-mono text-sm"
        />
      </div>
      <label className="flex items-center gap-3 text-sm font-medium text-ink">
        <input type="checkbox" checked={values.active} onChange={(e) => setValues({ ...values, active: e.target.checked })} className="size-4 accent-brand" />
        Active (shown on the Advertise page)
      </label>
      {formError && <FormStatus status="error" message={formError} />}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={saving}>
          {submitLabel}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
