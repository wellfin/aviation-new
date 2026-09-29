"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Card, ConfirmButton, EmptyState, ErrorPanel, PageHeader, StatusPill, formatDateTime } from "@/components/admin/ui";
import { BackLink } from "@/components/admin/enquiries/DetailList";
import { ImageUploadField } from "@/components/admin/news/ImageUploadField";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input, Select, Textarea } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { fieldErrors, type FieldErrors } from "@/lib/api/forms";
import { useApi } from "@/lib/hooks/useApi";
import { AdPreview } from "./AdPreview";
import { AD_PLACEMENTS, PLACEMENT_HINT, PLACEMENT_LABEL, adFormSchema, adState, type AdFormValues, type AdminAd } from "./schema";

type Feedback = { status: "success" | "error"; message: string } | null;
const STATE_TONE = { active: "green", paused: "slate", scheduled: "blue", ended: "amber" } as const;

/** ISO instant → `datetime-local` value in the browser's zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

const EMPTY: AdFormValues = {
  placement: "header-banner",
  advertiser: "",
  headline: "",
  body: "",
  image: "",
  href: "",
  cta: "",
  active: true,
  startsAt: "",
  endsAt: "",
  weight: 50,
};

function toValues(a: AdminAd): AdFormValues {
  return {
    placement: a.placement,
    advertiser: a.advertiser,
    headline: a.headline ?? "",
    body: a.body ?? "",
    image: a.image,
    href: a.href,
    cta: a.cta ?? "",
    active: a.active,
    startsAt: toLocalInput(a.startsAt),
    endsAt: toLocalInput(a.endsAt),
    weight: a.weight,
  };
}

export function AdEditor({ id }: { id?: string }) {
  const { data, error, loading, reload } = useApi<AdminAd>(id ? `/admin/ads/${encodeURIComponent(id)}` : null);
  const back = <BackLink href="/admin/ads">All ads</BackLink>;

  if (!id) {
    return (
      <>
        {back}
        <PageHeader title="New ad" description="Ads rotate by weight among the active ads of the same placement." />
        <AdForm />
      </>
    );
  }
  if (error && !data) {
    const missing = error.status === 404 || error.status === 422;
    return (
      <>
        {back}
        {missing ? (
          <Card>
            <EmptyState title="Ad not found" description="It may have been deleted." />
          </Card>
        ) : (
          <ErrorPanel error={error} onRetry={reload} />
        )}
      </>
    );
  }
  if (loading || !data) {
    return (
      <>
        {back}
        <div className="h-96 animate-pulse rounded-2xl bg-white shadow-soft" role="status" aria-label="Loading ad" />
      </>
    );
  }
  return (
    <>
      {back}
      <AdForm ad={data} />
    </>
  );
}

function AdForm({ ad: initial }: { ad?: AdminAd }) {
  const router = useRouter();
  const justCreated = useSearchParams().get("created") === "1";
  const [ad, setAd] = useState(initial);
  const [values, setValues] = useState<AdFormValues>(initial ? toValues(initial) : EMPTY);
  const [weightText, setWeightText] = useState(String(values.weight));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(justCreated ? { status: "success", message: "Ad created." } : null);
  const set = <K extends keyof AdFormValues>(key: K, value: AdFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = adFormSchema.safeParse({ ...values, weight: weightText.trim() === "" ? Number.NaN : Number(weightText) });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFeedback({ status: "error", message: "Please fix the highlighted fields." });
      return;
    }
    const v = parsed.data;
    setErrors({});
    setFeedback(null);
    setSaving(true);
    try {
      if (ad) {
        const next = await apiRequest<AdminAd>("PATCH", `/admin/ads/${ad.id}`, {
          ...v,
          headline: v.headline || null,
          body: v.body || null,
          cta: v.cta || null,
          startsAt: toIso(v.startsAt),
          endsAt: toIso(v.endsAt),
        });
        setAd(next);
        setValues(toValues(next));
        setWeightText(String(next.weight));
        setFeedback({ status: "success", message: "Changes saved." });
      } else {
        const created = await apiRequest<AdminAd>("POST", "/admin/ads", {
          placement: v.placement,
          advertiser: v.advertiser,
          image: v.image,
          href: v.href,
          active: v.active,
          weight: v.weight,
          ...(v.headline ? { headline: v.headline } : {}),
          ...(v.body ? { body: v.body } : {}),
          ...(v.cta ? { cta: v.cta } : {}),
          ...(v.startsAt ? { startsAt: toIso(v.startsAt) } : {}),
          ...(v.endsAt ? { endsAt: toIso(v.endsAt) } : {}),
        });
        router.replace(`/admin/ads/${created.id}?created=1`);
        return;
      }
    } catch (err) {
      if (err instanceof ApiError && err.body.fieldErrors) setErrors(err.body.fieldErrors);
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't save the ad." });
    }
    setSaving(false);
  }

  async function remove() {
    if (!ad) return;
    try {
      await apiRequest("DELETE", `/admin/ads/${ad.id}`);
      router.push("/admin/ads");
    } catch (err) {
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't delete the ad." });
    }
  }

  const preview = {
    id: ad?.id ?? "preview",
    placement: values.placement,
    advertiser: values.advertiser || "Advertiser name",
    headline: values.headline || undefined,
    body: values.body || undefined,
    image: values.image.trim(),
    href: values.href.trim(),
    cta: values.cta || undefined,
  };
  const state = ad ? adState(ad) : null;

  return (
    <form onSubmit={submit} noValidate>
      {ad && state && (
        <PageHeader
          title={`${ad.advertiser} — ${PLACEMENT_LABEL[ad.placement]}`}
          description={`${ad.impressions.toLocaleString()} impressions · ${ad.clicks.toLocaleString()} clicks · ${ad.ctr.toFixed(2)}% CTR · updated ${formatDateTime(ad.updatedAt)}`}
          actions={<StatusPill status={state} tone={STATE_TONE[state]} />}
        />
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card title="Creative">
            <div className="flex flex-col gap-4">
              <Select id="placement" name="placement" label="Placement" value={values.placement} onChange={(e) => set("placement", e.target.value as AdFormValues["placement"])} error={errors.placement}>
                {AD_PLACEMENTS.map((p) => (
                  <option key={p} value={p}>
                    {PLACEMENT_LABEL[p]}
                  </option>
                ))}
              </Select>
              <p className="-mt-2 text-xs text-muted">{PLACEMENT_HINT[values.placement]}</p>
              <Input id="advertiser" name="advertiser" label="Advertiser" value={values.advertiser} onChange={(e) => set("advertiser", e.target.value)} error={errors.advertiser} maxLength={120} />
              <Input id="headline" name="headline" label="Headline (optional)" value={values.headline} onChange={(e) => set("headline", e.target.value)} error={errors.headline} maxLength={160} />
              <Textarea id="body" name="body" label="Body (optional)" value={values.body} onChange={(e) => set("body", e.target.value)} error={errors.body} maxLength={500} className="min-h-[88px]" />
              <ImageUploadField id="image" label="Image" value={values.image} onChange={(url) => set("image", url)} error={errors.image} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="href" name="href" label="Link" value={values.href} onChange={(e) => set("href", e.target.value)} error={errors.href} maxLength={1000} placeholder="https://advertiser.example" />
                <Input id="cta" name="cta" label="Button text (optional)" value={values.cta} onChange={(e) => set("cta", e.target.value)} error={errors.cta} maxLength={60} placeholder="Learn more" />
              </div>
            </div>
          </Card>
          <Card title="Delivery">
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 text-sm font-medium text-ink">
                <input type="checkbox" checked={values.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-brand" />
                Active (paused ads are never served)
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="startsAt" name="startsAt" type="datetime-local" label="Starts (optional)" value={values.startsAt} onChange={(e) => set("startsAt", e.target.value)} error={errors.startsAt} />
                <Input id="endsAt" name="endsAt" type="datetime-local" label="Ends (optional)" value={values.endsAt} onChange={(e) => set("endsAt", e.target.value)} error={errors.endsAt} />
              </div>
              <Input
                id="weight"
                name="weight"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                step={1}
                label="Weight"
                value={weightText}
                onChange={(e) => setWeightText(e.target.value)}
                error={errors.weight}
                hint="1–100. Higher weights are shown more often than other ads in the same placement."
                wrapperClassName="sm:max-w-xs"
              />
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Live preview">
            <AdPreview placement={values.placement} ad={preview} />
          </Card>
          <Card>
            <div className="flex flex-col gap-3">
              {feedback && (
                <div aria-live="polite">
                  <FormStatus status={feedback.status} message={feedback.message} />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" loading={saving}>
                  {ad ? "Save changes" : "Create ad"}
                </Button>
                {ad && (
                  <ConfirmButton onConfirm={remove} confirmLabel="Delete ad" disabled={saving}>
                    Delete
                  </ConfirmButton>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
