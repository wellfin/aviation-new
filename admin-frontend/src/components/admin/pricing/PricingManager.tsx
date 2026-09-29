"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Card, ErrorPanel, PageHeader, StatusPill, formatDateTime } from "@/components/admin/ui";
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
      currency: "INR",
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
      <PageHeader title="Pricing plans" description="What the pricing page shows and which Razorpay plans subscriptions are billed against." />
      {error && !data ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="h-96 animate-pulse rounded-2xl bg-white shadow-soft" role="status" aria-label="Loading plans" />
      ) : (
        <>
          <nav aria-label="Plans" className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {PLAN_IDS.map((id) => {
              const p = plans.get(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={selected === id ? "page" : undefined}
                  onClick={() => set({ plan: id === "basic" ? "" : id })}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                    selected === id ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:bg-surface",
                  )}
                >
                  {p?.name ?? PLAN_LABEL[id]}
                  {p && <span className={cn("text-xs font-medium", selected === id ? "text-white/80" : "text-muted")}>{formatPlanPrice(p.monthlyPrice, p.currency)}/mo</span>}
                  {!p && <span className={cn("text-xs font-medium", selected === id ? "text-white/75" : "text-warning")}>not set up</span>}
                  {p && !p.active && <span className={cn("text-xs font-medium", selected === id ? "text-white/75" : "text-muted")}>hidden</span>}
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
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    set("features", next);
  };
  const iconBtn = "flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted transition hover:text-ink disabled:opacity-30";

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-6">
        <Card
          title={`${PLAN_LABEL[id]} plan`}
          actions={plan ? <StatusPill status={plan.active ? "active" : "draft"} /> : <StatusPill status="not set up" tone="amber" />}
        >
          {!plan && <p className="mb-4 text-sm text-muted">This plan doesn&apos;t exist yet. Saving creates it.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="name" name="name" label="Name" value={values.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={60} />
            <Input id="cta" name="cta" label="Button text" value={values.cta} onChange={(e) => set("cta", e.target.value)} error={errors.cta} maxLength={60} />
            <Input id="tagline" name="tagline" label="Tagline" value={values.tagline} onChange={(e) => set("tagline", e.target.value)} error={errors.tagline} maxLength={200} wrapperClassName="sm:col-span-2" />
          </div>
        </Card>
        <Card title="Price">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="monthlyPrice" name="monthlyPrice" label="Monthly" inputMode="decimal" value={values.monthlyPrice} onChange={(e) => set("monthlyPrice", e.target.value)} error={errors.monthlyPrice} placeholder="—" trailing={<span className="text-xs font-semibold text-muted">{values.currency || "—"}</span>} />
            <Input id="yearlyPrice" name="yearlyPrice" label="Yearly" inputMode="decimal" value={values.yearlyPrice} onChange={(e) => set("yearlyPrice", e.target.value)} error={errors.yearlyPrice} placeholder="—" trailing={<span className="text-xs font-semibold text-muted">{values.currency || "—"}</span>} />
            <Input id="currency" name="currency" label="Currency" value={values.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} error={errors.currency} maxLength={3} />
          </div>
          <PricePreview values={values} />
          <p className="mt-3 text-xs text-muted">Amounts in whole currency units (e.g. 4999 or 49.99). Leave a price blank for plans without a fixed price (e.g. &ldquo;Contact us&rdquo;).</p>
        </Card>
        <Card title="Features" actions={<span className="text-xs text-muted">{features.length}/50</span>}>
          {features.length === 0 && <p className="mb-3 text-sm text-muted">No features listed.</p>}
          <ol className="flex flex-col gap-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <label htmlFor={`feature-${i}`} className="sr-only">
                    Feature {i + 1}
                  </label>
                  <input
                    id={`feature-${i}`}
                    value={f}
                    maxLength={200}
                    onChange={(e) => set("features", features.map((x, j) => (j === i ? e.target.value : x)))}
                    aria-invalid={errors[`features.${i}`] ? true : undefined}
                    className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/15 aria-invalid:border-danger"
                  />
                  <FieldError id={`feature-${i}-error`} message={errors[`features.${i}`]} />
                </div>
                <button type="button" className={iconBtn} disabled={i === 0} onClick={() => moveFeature(i, -1)} aria-label={`Move feature ${i + 1} up`}>
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" className={iconBtn} disabled={i === features.length - 1} onClick={() => moveFeature(i, 1)} aria-label={`Move feature ${i + 1} down`}>
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" className={cn(iconBtn, "hover:text-danger")} onClick={() => set("features", features.filter((_, j) => j !== i))} aria-label={`Remove feature ${i + 1}`}>
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ol>
          <FieldError id="features-error" message={errors.features} />
          <Button type="button" variant="ghost" size="sm" className="mt-3" disabled={features.length >= 50} onClick={() => set("features", [...features, ""])}>
            <Plus className="size-4" aria-hidden /> Add feature
          </Button>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card title="Display">
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 text-sm font-medium text-ink">
              <input type="checkbox" checked={values.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-brand" />
              Active (shown on the pricing page)
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-ink">
              <input type="checkbox" checked={values.highlighted} onChange={(e) => set("highlighted", e.target.checked)} className="size-4 accent-brand" />
              Highlighted (&ldquo;most popular&rdquo;)
            </label>
            <Input id="order" name="order" label="Display order" inputMode="numeric" value={values.order} onChange={(e) => set("order", e.target.value)} error={errors.order} hint="Lower numbers appear first." />
          </div>
        </Card>
        <Card title="Razorpay">
          <div className="flex flex-col gap-4">
            <Input
              id="rzp-monthly"
              name="razorpayMonthly"
              label="Monthly plan id"
              value={values.razorpayPlanIds.monthly}
              onChange={(e) => set("razorpayPlanIds", { ...values.razorpayPlanIds, monthly: e.target.value })}
              error={errors["razorpayPlanIds.monthly"]}
              placeholder="plan_…"
              className="font-mono text-sm"
            />
            <Input
              id="rzp-yearly"
              name="razorpayYearly"
              label="Yearly plan id"
              value={values.razorpayPlanIds.yearly}
              onChange={(e) => set("razorpayPlanIds", { ...values.razorpayPlanIds, yearly: e.target.value })}
              error={errors["razorpayPlanIds.yearly"]}
              placeholder="plan_…"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted">Blank removes the link — paid checkout for that cycle is unavailable until an id is set.</p>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-3">
            {feedback && (
              <div aria-live="polite">
                <FormStatus status={feedback.status} message={feedback.message} />
              </div>
            )}
            <Button type="submit" loading={saving}>
              {plan ? "Save plan" : "Create plan"}
            </Button>
            {plan?.updatedAt && <p className="text-xs text-subtle">Last updated {formatDateTime(plan.updatedAt)}</p>}
          </div>
        </Card>
      </div>
    </form>
  );
}

/** Live "₹4,999 / month · ₹49,990 / year" line for the values being edited. */
function PricePreview({ values }: { values: PlanFormValues }) {
  const currency = /^[A-Za-z]{3}$/.test(values.currency.trim()) ? values.currency.trim().toUpperCase() : "";
  const amount = (v: string) => (/^\d{1,9}(\.\d{1,2})?$/.test(v.trim()) ? Number(v) : null);
  if (!currency) return null;
  return (
    <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-ink" aria-live="polite">
      <span className="font-semibold">{formatPlanPrice(amount(values.monthlyPrice), currency)}</span> / month ·{" "}
      <span className="font-semibold">{formatPlanPrice(amount(values.yearlyPrice), currency)}</span> / year
    </p>
  );
}
