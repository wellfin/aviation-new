"use client";

import { ArrowLeft, ArrowRight, ExternalLink, Eye, EyeOff, LayoutGrid, Pencil, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ActionIcon, ConfirmAction, Drawer, EmptyState, ErrorPanel, PageHeader, Switch } from "@/components/admin/ui";
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
const EMPTY: AdFormatFormValues = { key: "", icon: "📣", title: "", description: "", priceLabel: "", active: true };

export function AdFormatsManager() {
  const { data, error, loading, reload } = useApi<AdFormat[]>("/admin/ad-formats");
  const [list, setList] = useState<AdFormat[] | null>(null);
  // null = closed, "new" = create, otherwise the package being edited
  const [drawer, setDrawer] = useState<"new" | AdFormat | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Local edits win over the fetched list until the next reload.
  const [lastData, setLastData] = useState(data);
  if (lastData !== data) {
    setLastData(data);
    setList(null);
  }
  const formats = list ?? data ?? [];
  const live = formats.filter((f) => f.active).length;

  async function move(index: number, dir: -1 | 1) {
    const previous = formats;
    const next = [...formats];
    [next[index], next[index + dir]] = [next[index + dir]!, next[index]!];
    setList(next);
    setBusy(next[index + dir]!.id);
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
        description="Advertising products on the public Advertise page, shown in this order. Only live packages appear."
        actions={
          <>
            <a href={siteUrl("/advertise")} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white/70 px-3.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand">
              View Advertise page <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <Button onClick={() => setDrawer("new")}>
              <Plus className="size-4" aria-hidden /> New package
            </Button>
          </>
        }
      />

      {data && (
        <div className="mb-4 flex flex-wrap gap-2 text-[13px]">
          <Chip icon={LayoutGrid} label="Packages" value={formats.length} />
          <Chip icon={Eye} label="Live" value={live} tone="green" />
          <Chip icon={EyeOff} label="Hidden" value={formats.length - live} />
        </div>
      )}

      {feedback && (
        <div className="mb-4" aria-live="polite">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}

      {error && !data ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading ad packages">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass h-56 animate-pulse rounded-2xl border" />
          ))}
        </div>
      ) : formats.length === 0 ? (
        <div className="glass rounded-2xl border">
          <EmptyState
            title="No ad packages yet"
            description="Add the first product for the Advertise page."
            action={
              <Button size="sm" onClick={() => setDrawer("new")}>
                <Plus className="size-4" aria-hidden /> New package
              </Button>
            }
          />
        </div>
      ) : (
        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {formats.map((f, i) => (
            <li key={f.id} className={cn("glass group flex flex-col rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-16px_rgba(11,31,58,0.3)]", !f.active && "opacity-70")}>
              <div className="flex items-start gap-3 p-4 pb-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/15 to-brand-cyan/10 text-2xl ring-1 ring-brand/10" aria-hidden>
                  {f.icon || "📣"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold text-ink">{f.title}</span>
                  </p>
                  <p className="font-mono text-[11px] text-subtle">{f.id}</p>
                </div>
                <span className="rounded-lg bg-ink/[0.05] px-2 py-0.5 text-[11px] font-bold text-muted tabular-nums" title="Position on the Advertise page">
                  #{i + 1}
                </span>
              </div>
              <p className="line-clamp-3 flex-1 px-4 text-[13px] leading-5 text-ink/75">{f.description}</p>
              <div className="px-4 pt-3">
                {f.priceLabel ? (
                  <span className="inline-flex rounded-lg bg-brand/10 px-2.5 py-1 text-[13px] font-bold text-brand">{f.priceLabel}</span>
                ) : (
                  <span className="text-xs text-subtle">No price label</span>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/80 px-4 py-2.5">
                <Switch checked={f.active} disabled={busy !== null} onChange={() => toggleActive(f)} label={f.active ? "Live" : "Hidden"} />
                <div className="flex items-center gap-0.5">
                  <ActionIcon icon={ArrowLeft} label={`Move "${f.title}" earlier`} hint="Move earlier on the Advertise page" disabled={i === 0 || busy !== null} onClick={() => move(i, -1)} />
                  <ActionIcon icon={ArrowRight} label={`Move "${f.title}" later`} hint="Move later on the Advertise page" disabled={i === formats.length - 1 || busy !== null} onClick={() => move(i, 1)} />
                  <ActionIcon icon={Pencil} label={`Edit "${f.title}"`} hint="Edit title, description, icon and price" onClick={() => setDrawer(f)} />
                  <ConfirmAction label={`Delete "${f.title}"`} hint="Delete this package permanently" confirmHint="Yes, delete package" onConfirm={() => remove(f)} />
                </div>
              </div>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setDrawer("new")}
              className="flex h-full min-h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/25 bg-white/40 text-sm font-semibold text-brand transition hover:border-brand/50 hover:bg-white/70"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10">
                <Plus className="size-5" aria-hidden />
              </span>
              Add a package
            </button>
          </li>
        </ol>
      )}

      <Drawer
        open={drawer !== null}
        title={drawer === "new" ? "New package" : "Edit package"}
        description={drawer === "new" ? "It's added at the end of the Advertise page." : drawer ? `Id: ${drawer.id}` : undefined}
        onClose={() => setDrawer(null)}
      >
        {drawer !== null && (
          <AdFormatForm
            key={drawer === "new" ? "new" : drawer.id}
            initial={drawer === "new" ? EMPTY : { key: drawer.id, icon: drawer.icon, title: drawer.title, description: drawer.description, priceLabel: drawer.priceLabel, active: drawer.active }}
            isNew={drawer === "new"}
            submitLabel={drawer === "new" ? "Create package" : "Save changes"}
            onCancel={() => setDrawer(null)}
            onSubmit={async (v) => {
              if (drawer === "new") {
                const created = await apiRequest<AdFormat>("POST", "/admin/ad-formats", v);
                setList([...formats, created].sort((a, b) => a.order - b.order));
                setFeedback({ status: "success", message: `Created "${created.title}".` });
              } else {
                const body = { icon: v.icon, title: v.title, description: v.description, priceLabel: v.priceLabel, active: v.active };
                const updated = await apiRequest<AdFormat>("PATCH", `/admin/ad-formats/${drawer.id}`, body);
                setList(formats.map((x) => (x.id === drawer.id ? updated : x)));
                setFeedback({ status: "success", message: `Saved "${updated.title}".` });
              }
              setDrawer(null);
            }}
          />
        )}
      </Drawer>
    </>
  );
}

function Chip({ icon: Icon, label, value, tone }: { icon: typeof Eye; label: string; value: number; tone?: "green" }) {
  return (
    <span className="glass inline-flex items-center gap-2 rounded-xl border px-3 py-1.5">
      <Icon className={cn("size-4", tone === "green" ? "text-[#15803d]" : "text-muted")} aria-hidden />
      <span className="text-muted">{label}</span>
      <span className="font-bold text-ink tabular-nums">{value}</span>
    </span>
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
      {/* Live preview, as on the Advertise page */}
      <div className="rounded-2xl border border-line bg-gradient-to-br from-white to-brand/[0.04] p-4">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">Preview</p>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-2xl" aria-hidden>
            {values.icon || "📣"}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-ink">{values.title || "Package title"}</p>
            <p className="mt-0.5 text-[13px] text-muted">{values.description || "A short description of what the advertiser gets."}</p>
            {values.priceLabel && <p className="mt-1.5 text-[13px] font-bold text-brand">{values.priceLabel}</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)]">
        <Input id={`${idp}-icon`} name="icon" label="Icon" value={values.icon} maxLength={8} onChange={(e) => setValues({ ...values, icon: e.target.value })} error={errors.icon} className="text-center text-xl" hint="Emoji" />
        <Input
          id={`${idp}-title`}
          name="title"
          label="Title *"
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
      <Textarea
        id={`${idp}-description`}
        name="description"
        label="Description *"
        value={values.description}
        maxLength={300}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        error={errors.description}
        hint={`${values.description.length}/300 characters`}
        className="min-h-24"
      />
      <Input
        id={`${idp}-priceLabel`}
        name="priceLabel"
        label="Price label"
        value={values.priceLabel}
        maxLength={60}
        placeholder="From ₹25,000 / month"
        onChange={(e) => setValues({ ...values, priceLabel: e.target.value })}
        error={errors.priceLabel}
        hint="Optional. Shown under the description."
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
        hint={isNew ? "Filled from the title. Lowercase letters, numbers and dashes; can't be changed later." : "The id can't be changed."}
        className="font-mono text-sm"
      />
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-white/70 px-4 py-3">
        <span className="text-sm">
          <span className="block font-semibold text-ink">Live on the Advertise page</span>
          <span className="block text-xs text-muted">Turn off to keep it as a hidden draft.</span>
        </span>
        <input type="checkbox" role="switch" checked={values.active} onChange={(e) => setValues({ ...values, active: e.target.checked })} className="switch" />
      </label>
      {formError && <FormStatus status="error" message={formError} />}
      <div className="sticky bottom-0 -mx-6 -mb-5 flex justify-end gap-2 border-t border-line bg-white/90 px-6 py-3 backdrop-blur">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
