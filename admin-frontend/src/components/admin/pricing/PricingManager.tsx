"use client";

import { ArrowDown, ArrowUp, Check, CreditCard, ListChecks, Plus, Settings2, Sparkles, Tag, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ErrorPanel, PageHeader, StatusPill, formatDateTime } from "@/components/admin/ui";
import { FormSection } from "@/components/admin/providers/form-kit";
import { Button } from "@/components/ui/Button";
import { FieldError, FormStatus, Input } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { fieldErrors, type FieldErrors } from "@/lib/api/forms";
import { useApi } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { cn } from "@/lib/utils";
import { PLAN_IDS, PLAN_LABEL, planFormSchema, type AdminPlan, type PlanFormValues, type PlanId } from "./schema";

const priceText = (n: number | null) => (n === null ? "" : String(n));

/** Whole-unit price with its currency (plan prices are not in paise). */
function formatPlanPrice(amount: number | null, currency: string): string {
  if (amount === null) return "Custom";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function toValues(plan: AdminPlan | undefined, id: PlanId): PlanFormValues {
  if (!plan) {
    return {
      name: PLAN_LABEL[id],
      tagline: "",
      monthlyPrice: "",
      yearlyPrice: "",
      currency: "USD",
      highlighted: false,
      features: [],
      cta: "Get started",
      active: true,
      order: String(PLAN_IDS.indexOf(id)),
      razorpayPlanIds: { monthly: "", yearly: "" },
    };
  }
  return {
    name: plan.name,
    tagline: plan.tagline,
    monthlyPrice: priceText(plan.monthlyPrice),
    yearlyPrice: priceText(plan.yearlyPrice),
    currency: plan.currency,
    highlighted: plan.highlighted,
    features: [...plan.features],
    cta: plan.cta,
    active: plan.active,
    order: String(plan.order),
    razorpayPlanIds: { monthly: plan.razorpayPlanIds.monthly ?? "", yearly: plan.razorpayPlanIds.yearly ?? "" },
  };
}

export function PricingManager() {
  const { get, set } = useUrlParams();
  const { data, error, loading, reload } = useApi<AdminPlan[]>("/admin/pricing/plans");
  const [saved, setSaved] = useState<Partial<Record<PlanId, AdminPlan>>>({});
  const selected = (PLAN_IDS as readonly string[]).includes(get("plan")) ? (get("plan") as PlanId) : "basic";
  const plans = new Map<PlanId, AdminPlan>();
  for (const p of data ?? []) plans.set(p.id, p);
  for (const [id, p] of Object.entries(saved) as Array<[PlanId, AdminPlan]>) plans.set(id, p);
  const plan = plans.get(selected);

  return (
    <>
      <PageHeader title="Pricing plans" description="What the pricing page shows for each plan, and the Razorpay plan each subscription is billed against." />
      {error && !data ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading plans">
          {PLAN_IDS.map((id) => (
            <div key={id} className="glass h-28 animate-pulse rounded-2xl border" />
          ))}
        </div>
      ) : (
        <>
          <nav aria-label="Plans" className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {PLAN_IDS.map((id) => {
              const p = plans.get(id);
              const on = selected === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => set({ plan: id === "basic" ? "" : id })}
                  className={cn(
                    "glass relative flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5",
                    on && "ring-2 ring-brand shadow-[0_12px_30px_-14px_rgba(47,128,237,0.55)]",
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-muted">{p?.name ?? PLAN_LABEL[id]}</span>
                    {!p ? (
                      <StatusPill status="not set up" tone="amber" />
                    ) : p.highlighted ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-bold text-brand">
                        <Sparkles className="size-3" aria-hidden /> Popular
                      </span>
                    ) : (
                      <StatusPill status={p.active ? "active" : "hidden"} tone={p.active ? "green" : "slate"} />
                    )}
                  </span>
                  <span className="text-xl font-extrabold text-ink tabular-nums">
                    {p ? formatPlanPrice(p.yearlyPrice, p.currency) : "—"}
                    {p && p.yearlyPrice !== null && <span className="ml-1 text-xs font-medium text-muted">/ year</span>}
                  </span>
                  <span className="text-xs text-muted">{p ? `${p.features.length} feature${p.features.length === 1 ? "" : "s"}${p.active ? "" : " · hidden"}` : "Saving creates it"}</span>
                  {on && <span className="absolute inset-x-6 -bottom-px h-0.5 rounded-full bg-brand" aria-hidden />}
                </button>
              );
            })}
          </nav>
          <PlanForm key={selected} id={selected} plan={plan} onSaved={(p) => setSaved((s) => ({ ...s, [p.id]: p }))} />
        </>
      )}
    </>
  );
}

function PlanForm({ id, plan, onSaved }: { id: PlanId; plan: AdminPlan | undefined; onSaved: (plan: AdminPlan) => void }) {
  const [values, setValues] = useState<PlanFormValues>(() => toValues(plan, id));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const set = <K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = planFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFeedback({ status: "error", message: "Please fix the highlighted fields." });
      return;
    }
    setErrors({});
    setFeedback(null);
    setSaving(true);
    try {
      const next = await apiRequest<AdminPlan>("PUT", `/admin/pricing/plans/${id}`, parsed.data);
      setFeedback({ status: "success", message: plan ? "Plan saved." : "Plan created." });
      setValues(toValues(next, id));
      onSaved(next);
    } catch (err) {
      if (err instanceof ApiError && err.body.fieldErrors) setErrors(err.body.fieldErrors);
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't save the plan." });
    } finally {
      setSaving(false);
    }
  }

  const features = values.features;
  const moveFeature = (i: number, dir: -1 | 1) => {
    const next = [...features];
    [next[i], next[i + dir]] = [next[i + dir]!, next[i]!];
    set("features", next);
  };
  const iconBtn = "flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-brand/10 hover:text-brand disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        {!plan && <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-[#a16207]">This plan doesn&apos;t exist yet. Saving creates it.</p>}
        <FormSection id="plan" icon={Tag} title={`${PLAN_LABEL[id]} plan`} description="The name, line under it and the button on the pricing page.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="name" name="name" label="Name" value={values.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={60} />
            <Input id="cta" name="cta" label="Button text" value={values.cta} onChange={(e) => set("cta", e.target.value)} error={errors.cta} maxLength={60} />
            <Input id="tagline" name="tagline" label="Tagline" value={values.tagline} onChange={(e) => set("tagline", e.target.value)} error={errors.tagline} maxLength={200} wrapperClassName="sm:col-span-2" />
          </div>
        </FormSection>

        <FormSection id="price" icon={CreditCard} title="Price" description="Plans are sold per year. Leave the price blank for a plan without a fixed price (e.g. “Contact us”).">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
            <Input id="yearlyPrice" name="yearlyPrice" label="Yearly price" inputMode="decimal" value={values.yearlyPrice} onChange={(e) => set("yearlyPrice", e.target.value)} error={errors.yearlyPrice} placeholder="e.g. 4999 or 49.99" trailing={<span className="text-xs font-semibold text-muted">{values.currency || "—"}</span>} />
            <Input id="currency" name="currency" label="Currency" value={values.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} error={errors.currency} maxLength={3} className="font-mono uppercase" />
          </div>
        </FormSection>

        <FormSection id="features" icon={ListChecks} title="Features" description="Ticked lines on the pricing card, in this order.">
          {features.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No features yet. Add the first one below.</p>}
          {features.length > 0 && (
            <ol className="flex flex-col gap-2">
              {features.map((f, i) => (
                <li key={i} className="group flex items-start gap-2 rounded-xl border border-line bg-white/60 p-1.5 pl-3 transition focus-within:border-brand/50">
                  <Check className="mt-2.5 size-4 shrink-0 text-[#15803d]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`feature-${i}`} className="sr-only">
                      Feature {i + 1}
                    </label>
                    <input
                      id={`feature-${i}`}
                      value={f}
                      maxLength={200}
                      placeholder="e.g. Verified badge on the listing"
                      onChange={(e) => set("features", features.map((x, j) => (j === i ? e.target.value : x)))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (features.length < 50) set("features", [...features.slice(0, i + 1), "", ...features.slice(i + 1)]);
                          setTimeout(() => document.getElementById(`feature-${i + 1}`)?.focus(), 0);
                        }
                      }}
                      aria-invalid={errors[`features.${i}`] ? true : undefined}
                      className="h-9 w-full bg-transparent text-sm text-ink outline-none placeholder:text-subtle aria-invalid:text-danger"
                    />
                    <FieldError id={`feature-${i}-error`} message={errors[`features.${i}`]} />
                  </div>
                  <span className="flex shrink-0 items-center">
                    <button type="button" className={iconBtn} disabled={i === 0} onClick={() => moveFeature(i, -1)} aria-label={`Move feature ${i + 1} up`} title="Move up">
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" className={iconBtn} disabled={i === features.length - 1} onClick={() => moveFeature(i, 1)} aria-label={`Move feature ${i + 1} down`} title="Move down">
                      <ArrowDown className="size-4" />
                    </button>
                    <button type="button" className={cn(iconBtn, "hover:bg-danger/10 hover:text-danger")} onClick={() => set("features", features.filter((_, j) => j !== i))} aria-label={`Remove feature ${i + 1}`} title="Remove">
                      <Trash2 className="size-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <FieldError id="features-error" message={errors.features} />
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" size="sm" disabled={features.length >= 50} onClick={() => set("features", [...features, ""])}>
              <Plus className="size-4" aria-hidden /> Add feature
            </Button>
            <span className="text-xs text-muted">{features.length}/50 · Enter adds a new line</span>
          </div>
        </FormSection>
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-24">
        <div className="glass flex flex-col gap-2 rounded-2xl border p-4">
          {feedback && (
            <div aria-live="polite">
              <FormStatus status={feedback.status} message={feedback.message} />
            </div>
          )}
          <Button type="submit" loading={saving} className="w-full">
            {plan ? "Save plan" : "Create plan"}
          </Button>
          <p className="text-center text-xs text-muted">{plan?.updatedAt ? `Last updated ${formatDateTime(plan.updatedAt)}` : "Not saved yet"}</p>
        </div>

        <PlanPreview values={values} />

        <FormSection id="display" icon={Settings2} title="Display">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-white/70 px-4 py-3">
            <span className="text-sm">
              <span className="block font-semibold text-ink">Active</span>
              <span className="block text-xs text-muted">Shown on the pricing page.</span>
            </span>
            <input type="checkbox" role="switch" checked={values.active} onChange={(e) => set("active", e.target.checked)} className="switch" />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-white/70 px-4 py-3">
            <span className="text-sm">
              <span className="block font-semibold text-ink">Most popular</span>
              <span className="block text-xs text-muted">Highlights this card.</span>
            </span>
            <input type="checkbox" role="switch" checked={values.highlighted} onChange={(e) => set("highlighted", e.target.checked)} className="switch" />
          </label>
          <Input id="order" name="order" label="Display order" inputMode="numeric" value={values.order} onChange={(e) => set("order", e.target.value)} error={errors.order} hint="Lower numbers appear first." />
        </FormSection>

        <FormSection id="razorpay" icon={CreditCard} title="Razorpay">
          <Input
            id="rzp-yearly"
            name="razorpayYearly"
            label="Yearly plan id"
            value={values.razorpayPlanIds.yearly}
            onChange={(e) => set("razorpayPlanIds", { ...values.razorpayPlanIds, yearly: e.target.value })}
            error={errors["razorpayPlanIds.yearly"]}
            placeholder="plan_…"
            className="font-mono text-sm"
            hint="Blank removes the link: paid checkout is unavailable until an id is set."
          />
        </FormSection>
      </aside>
    </form>
  );
}

/** Live pricing card, as visitors will see it. */
function PlanPreview({ values }: { values: PlanFormValues }) {
  const currency = /^[A-Za-z]{3}$/.test(values.currency.trim()) ? values.currency.trim().toUpperCase() : "USD";
  const amount = /^\d{1,9}(\.\d{1,2})?$/.test(values.yearlyPrice.trim()) ? Number(values.yearlyPrice) : null;
  const features = values.features.filter((f) => f.trim());
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-white p-5 shadow-soft", values.highlighted ? "border-brand ring-2 ring-brand/20" : "border-line")} aria-label="Pricing card preview">
      <p className="mb-3 text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">Preview</p>
      {values.highlighted && (
        <span className="bg-brand-gradient absolute top-4 right-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white">
          <Sparkles className="size-3" aria-hidden /> Most popular
        </span>
      )}
      <p className="text-lg font-extrabold text-ink">{values.name || "Plan name"}</p>
      {values.tagline && <p className="mt-0.5 text-[13px] text-muted">{values.tagline}</p>}
      <p className="mt-3 text-3xl font-extrabold tracking-[-0.5px] text-ink tabular-nums">
        {formatPlanPrice(amount, currency)}
        {amount !== null && <span className="ml-1 text-sm font-medium text-muted">/ year</span>}
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {features.length === 0 && <li className="text-[13px] text-subtle">Features appear here.</li>}
        {features.slice(0, 8).map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-ink">
            <Check className="mt-0.5 size-4 shrink-0 text-[#15803d]" aria-hidden /> {f}
          </li>
        ))}
        {features.length > 8 && <li className="text-xs text-muted">+{features.length - 8} more</li>}
      </ul>
      <span className={cn("mt-5 flex h-10 items-center justify-center rounded-xl text-sm font-semibold", values.highlighted ? "bg-brand-gradient text-white" : "border border-brand/40 text-brand")}>{values.cta || "Get started"}</span>
      {!values.active && <p className="mt-3 text-center text-xs font-medium text-[#a16207]">Hidden: not shown on the pricing page</p>}
    </div>
  );
}
