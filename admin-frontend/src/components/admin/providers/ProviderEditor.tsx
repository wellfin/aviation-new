"use client";

import { siteUrl } from "@/components/admin/news/site";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Card, EmptyState, ErrorPanel, StatusPill, formatDateTime } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input, Select, Textarea } from "@/components/ui/Field";
import { fieldErrors } from "@/lib/api/forms";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useApi } from "@/lib/hooks/useApi";
import { useCategories } from "@/components/admin/services/categories";
import { AirportsInput } from "./AirportsInput";
import { FormSection, GalleryEditor, Grid, IconButton, Repeater, Toggle, UploadField } from "./form-kit";
import {
  emptyProviderState,
  FLEET_CATEGORIES,
  PROVIDER_TIERS,
  providerSchema,
  rawPayload,
  requestBody,
  stateFromProvider,
  TIER_LABEL,
  type AdminProvider,
  type ProviderFormState,
} from "./schema";
import { StatusActions } from "./StatusActions";
import { formatBytes } from "./upload";

type Feedback = { status: "success" | "error"; message: string } | null;

const SECTIONS = [
  ["basics", "Basics"],
  ["media", "Media"],
  ["contact", "Contact"],
  ["about", "About"],
  ["services", "Services"],
  ["airports", "Airports"],
  ["certifications", "Certifications"],
  ["brochures", "Brochures"],
  ["fleet", "Fleet"],
] as const;

const back = (
  <Link href="/admin/providers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
    <ArrowLeft className="size-4" /> All providers
  </Link>
);

/** Loads a listing (edit) or starts blank (create), then renders the form. */
export function ProviderEditor({ id }: { id?: string }) {
  const { data, error, reload } = useApi<AdminProvider>(id ? `/admin/providers/${id}` : null);
  if (!id) return <ProviderForm initial={null} />;
  if (error && !data) {
    return (
      <>
        {back}
        {error.status === 404 ? <EmptyState title="Listing not found" description="It may have been deleted." /> : <ErrorPanel error={error} onRetry={reload} />}
      </>
    );
  }
  if (!data) {
    return (
      <>
        {back}
        <div className="h-96 animate-pulse rounded-2xl bg-white" role="status" aria-label="Loading listing" />
      </>
    );
  }
  return <ProviderForm key={data.id} initial={data} />;
}

function ProviderForm({ initial }: { initial: AdminProvider | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const mode = initial ? "edit" : "create";
  const [provider, setProvider] = useState(initial);
  const [s, setS] = useState<ProviderFormState>(() => (initial ? stateFromProvider(initial) : emptyProviderState()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(params.get("created") ? { status: "success", message: "Listing created." } : null);
  const statusRef = useRef<HTMLDivElement>(null);
  const catalogue = useCategories();

  const set = <K extends keyof ProviderFormState>(key: K, value: ProviderFormState[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };
  const e = (path: string) => errors[path];
  const show = (fb: Feedback) => {
    setFeedback(fb);
    requestAnimationFrame(() => statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const parsed = providerSchema.safeParse(rawPayload(s, mode));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      show({ status: "error", message: "Please correct the highlighted fields." });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const body = requestBody(parsed.data, mode);
      if (mode === "create") {
        const created = await apiRequest<AdminProvider>("POST", "/admin/providers", body);
        router.replace(`/admin/providers/${created.id}?created=1`);
        return;
      }
      const updated = await apiRequest<AdminProvider>("PATCH", `/admin/providers/${provider!.id}`, body);
      setProvider(updated);
      setS(stateFromProvider(updated));
      setDirty(false);
      show({ status: "success", message: "Changes saved." });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body.fieldErrors) setErrors(err.body.fieldErrors);
        show({ status: "error", message: err.body.message });
      } else show({ status: "error", message: "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const errorList = Object.entries(errors);
  const limits = provider?.limits ?? { galleryImages: 30, video: true, socials: true };

  return (
    <>
      {back}
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{mode === "create" ? "New listing" : provider!.name}</h1>
          {provider && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <StatusPill status={provider.status} /> /{provider.slug} · updated {formatDateTime(provider.updatedAt)}
            </p>
          )}
        </div>
        <nav aria-label="Form sections" className="flex flex-wrap gap-1 text-xs">
          {SECTIONS.map(([idx, label]) => (
            <a key={idx} href={`#${idx}`} className="rounded-lg border border-line bg-white px-2 py-1 font-semibold text-muted hover:text-brand">
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div ref={statusRef} className="mb-4 flex flex-col gap-2 empty:hidden" aria-live="polite">
        {feedback && <FormStatus status={feedback.status} message={feedback.message} />}
        {errorList.length > 0 && (
          <ul className="list-inside list-disc rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {errorList.slice(0, 8).map(([k, v]) => (
              <li key={k}>
                <span className="font-semibold">{k === "_form" ? "Form" : k}</span>: {v}
              </li>
            ))}
            {errorList.length > 8 && <li>…and {errorList.length - 8} more</li>}
          </ul>
        )}
      </div>

      <form onSubmit={submit} noValidate className="grid items-start gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <FormSection id="basics" title="Basics">
            <Input label="Business name *" name="name" value={s.name} maxLength={120} onChange={(ev) => set("name", ev.target.value)} error={e("name")} />
            <Grid>
              <Select label="Category *" name="category" value={s.category} onChange={(ev) => set("category", ev.target.value)} error={e("category")}>
                <option value="">{catalogue.loading ? "Loading…" : "Choose…"}</option>
                {catalogue.categories.map((c) => (
                  <option key={c.slug} value={c.slug} disabled={!c.active && c.slug !== s.category}>
                    {c.name}
                    {c.active ? "" : " (inactive)"}
                  </option>
                ))}
                {s.category && !catalogue.loading && !catalogue.categories.some((c) => c.slug === s.category) && <option value={s.category}>{s.category}</option>}
              </Select>
              <Input
                label="Slug"
                name="slug"
                value={s.slug}
                maxLength={120}
                placeholder={mode === "create" ? "Generated from the name" : undefined}
                onChange={(ev) => set("slug", ev.target.value.toLowerCase())}
                error={e("slug")}
                hint="Public URL: /providers/<slug>"
              />
            </Grid>
            <Grid cols={3}>
              <Input label="City *" name="city" value={s.city} maxLength={80} onChange={(ev) => set("city", ev.target.value)} error={e("city")} />
              <Input label="Country *" name="country" value={s.country} maxLength={80} onChange={(ev) => set("country", ev.target.value)} error={e("country")} />
              <Input
                label="Country code *"
                name="countryCode"
                value={s.countryCode}
                maxLength={2}
                placeholder="IN"
                onChange={(ev) => set("countryCode", ev.target.value.toUpperCase())}
                error={e("countryCode")}
              />
            </Grid>
            <Textarea label="Summary *" name="summary" value={s.summary} maxLength={300} onChange={(ev) => set("summary", ev.target.value)} error={e("summary")} className="min-h-20" />
            <Grid cols={3}>
              <Input label="Founded" name="foundedYear" type="number" inputMode="numeric" min={1900} max={2100} value={s.foundedYear} onChange={(ev) => set("foundedYear", ev.target.value)} error={e("foundedYear")} />
              <Input label="Employees" name="employees" value={s.employees} maxLength={20} placeholder="50–100" onChange={(ev) => set("employees", ev.target.value)} error={e("employees")} />
              <Input label="Locations label" name="locationsLabel" value={s.locationsLabel} maxLength={60} placeholder="12 locations worldwide" onChange={(ev) => set("locationsLabel", ev.target.value)} error={e("locationsLabel")} />
            </Grid>
          </FormSection>

          <FormSection id="media" title="Media" description="Upload PNG, JPG or WebP images, or paste a URL.">
            <Grid>
              <UploadField id="logo" label="Logo" kind="image" value={s.logo} onChange={(v) => set("logo", v)} error={e("logo")} previewClassName="size-24" />
              <UploadField id="coverImage" label="Cover image" kind="image" value={s.coverImage} onChange={(v) => set("coverImage", v)} error={e("coverImage")} />
            </Grid>
            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-[0.6px] text-muted uppercase">Gallery</p>
              <GalleryEditor images={s.gallery} onChange={(v) => set("gallery", v)} max={30} error={e("gallery")} errorFor={(i) => e(`gallery.${i}`)} />
              {s.gallery.length > limits.galleryImages && (
                <p className="mt-1.5 text-xs text-[#a16207]">The {TIER_LABEL[s.tier]} plan normally shows up to {limits.galleryImages} images; staff can exceed it.</p>
              )}
            </div>
            <Input label="Video URL" name="videoUrl" value={s.videoUrl} maxLength={500} placeholder="https://…" onChange={(ev) => set("videoUrl", ev.target.value)} error={e("videoUrl")} hint={limits.video ? undefined : "Videos are an Ultra Pro feature."} />
          </FormSection>

          <FormSection id="contact" title="Contact & socials">
            <Grid>
              <Input label="Phone" name="contact.phone" value={s.contact.phone} maxLength={30} onChange={(ev) => set("contact", { ...s.contact, phone: ev.target.value })} error={e("contact.phone")} />
              <Input label="Email" name="contact.email" type="email" value={s.contact.email} maxLength={254} onChange={(ev) => set("contact", { ...s.contact, email: ev.target.value })} error={e("contact.email")} />
              <Input label="Website" name="contact.website" value={s.contact.website} maxLength={200} onChange={(ev) => set("contact", { ...s.contact, website: ev.target.value })} error={e("contact.website")} />
              <Input label="Fax" name="contact.fax" value={s.contact.fax} maxLength={30} onChange={(ev) => set("contact", { ...s.contact, fax: ev.target.value })} error={e("contact.fax")} />
              <Input label="Location" name="contact.location" value={s.contact.location} maxLength={120} placeholder="Terminal 2, General Aviation" onChange={(ev) => set("contact", { ...s.contact, location: ev.target.value })} error={e("contact.location")} />
              <Input label="Address" name="contact.address" value={s.contact.address} maxLength={300} onChange={(ev) => set("contact", { ...s.contact, address: ev.target.value })} error={e("contact.address")} />
            </Grid>
            <Grid>
              {(["linkedin", "instagram", "facebook", "x"] as const).map((k) => (
                <Input
                  key={k}
                  label={k === "x" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)}
                  name={`socials.${k}`}
                  value={s.socials[k]}
                  maxLength={500}
                  placeholder="https://…"
                  onChange={(ev) => set("socials", { ...s.socials, [k]: ev.target.value })}
                  error={e(`socials.${k}`) ?? (k === "linkedin" ? e("socials") : undefined)}
                />
              ))}
            </Grid>
          </FormSection>

          <FormSection id="about" title="About" description="Up to 10 paragraphs, shown on the profile page.">
            {s.about.map((para, i) => (
              <div key={i} className="flex items-start gap-2">
                <Textarea
                  label={`Paragraph ${i + 1}`}
                  name={`about.${i}`}
                  value={para}
                  maxLength={2000}
                  onChange={(ev) => set("about", s.about.map((p, j) => (j === i ? ev.target.value : p)))}
                  error={e(`about.${i}`)}
                  wrapperClassName="flex-1"
                  className="min-h-24"
                />
                <div className="mt-6">
                  <IconButton label={`Remove paragraph ${i + 1}`} danger onClick={() => set("about", s.about.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={s.about.length >= 10}
              onClick={() => set("about", [...s.about, ""])}
              className="inline-flex h-9 w-fit items-center gap-1.5 rounded-xl border border-brand/40 px-3 text-sm font-semibold text-brand hover:bg-brand/5 disabled:opacity-40"
            >
              <Plus className="size-4" /> Add paragraph
            </button>
          </FormSection>

          <FormSection id="services" title="Services">
            <Repeater
              items={s.services}
              onChange={(v) => set("services", v)}
              create={() => ({ name: "", description: "", icon: "plane" })}
              max={30}
              addLabel="Add service"
              itemLabel={(it, i) => it.name || `Service ${i + 1}`}
              errorId="services-error"
              error={e("services")}
            >
              {(it, i, update) => (
                <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                  <Input label="Name *" name={`services.${i}.name`} value={it.name} maxLength={80} onChange={(ev) => update({ name: ev.target.value })} error={e(`services.${i}.name`)} />
                  <Input label="Icon" name={`services.${i}.icon`} value={it.icon} maxLength={40} placeholder="plane" onChange={(ev) => update({ icon: ev.target.value.toLowerCase() })} error={e(`services.${i}.icon`)} />
                  <Textarea label="Description" name={`services.${i}.description`} value={it.description} maxLength={500} onChange={(ev) => update({ description: ev.target.value })} error={e(`services.${i}.description`)} wrapperClassName="sm:col-span-2" className="min-h-20" />
                </div>
              )}
            </Repeater>
          </FormSection>

          <FormSection id="airports" title="Airports">
            <AirportsInput value={s.airports} onChange={(v) => set("airports", v)} max={50} error={e("airports") ?? Object.entries(errors).find(([k]) => k.startsWith("airports."))?.[1]} />
          </FormSection>

          <FormSection id="certifications" title="Certifications">
            <Repeater
              items={s.certifications}
              onChange={(v) => set("certifications", v)}
              create={() => ({ name: "", issuer: "", validUntil: "", code: "" })}
              max={20}
              addLabel="Add certification"
              itemLabel={(it, i) => it.name || `Certification ${i + 1}`}
              errorId="certifications-error"
              error={e("certifications")}
            >
              {(it, i, update) => (
                <Grid cols={4}>
                  <Input label="Name *" name={`certifications.${i}.name`} value={it.name} maxLength={120} onChange={(ev) => update({ name: ev.target.value })} error={e(`certifications.${i}.name`)} />
                  <Input label="Issuer *" name={`certifications.${i}.issuer`} value={it.issuer} maxLength={120} onChange={(ev) => update({ issuer: ev.target.value })} error={e(`certifications.${i}.issuer`)} />
                  <Input label="Valid until" name={`certifications.${i}.validUntil`} type="date" value={it.validUntil} onChange={(ev) => update({ validUntil: ev.target.value })} error={e(`certifications.${i}.validUntil`)} />
                  <Input label="Code" name={`certifications.${i}.code`} value={it.code} maxLength={60} onChange={(ev) => update({ code: ev.target.value })} error={e(`certifications.${i}.code`)} />
                </Grid>
              )}
            </Repeater>
          </FormSection>

          <FormSection id="brochures" title="Brochures" description="PDF documents offered for download on the profile.">
            <Repeater
              items={s.brochures}
              onChange={(v) => set("brochures", v)}
              create={() => ({ title: "", fileType: "PDF" as const, sizeLabel: "", url: "" })}
              max={20}
              addLabel="Add brochure"
              itemLabel={(it, i) => it.title || `Brochure ${i + 1}`}
              errorId="brochures-error"
              error={e("brochures")}
            >
              {(it, i, update) => (
                <div className="flex flex-col gap-3">
                  <Grid cols={3}>
                    <Input label="Title *" name={`brochures.${i}.title`} value={it.title} maxLength={150} onChange={(ev) => update({ title: ev.target.value })} error={e(`brochures.${i}.title`)} />
                    <Select label="File type" name={`brochures.${i}.fileType`} value={it.fileType} onChange={(ev) => update({ fileType: ev.target.value as "PDF" | "DOCX" })}>
                      <option value="PDF">PDF</option>
                      <option value="DOCX">DOCX</option>
                    </Select>
                    <Input label="Size label" name={`brochures.${i}.sizeLabel`} value={it.sizeLabel} maxLength={20} placeholder="2.4 MB" onChange={(ev) => update({ sizeLabel: ev.target.value })} error={e(`brochures.${i}.sizeLabel`)} />
                  </Grid>
                  <UploadField
                    id={`brochures.${i}.url`}
                    label="File *"
                    kind="document"
                    value={it.url}
                    onChange={(url) => update({ url })}
                    onUploaded={(f) => update({ url: f.url, fileType: "PDF", sizeLabel: formatBytes(f.size), ...(it.title ? {} : { title: f.originalName.replace(/\.pdf$/i, "").slice(0, 150) }) })}
                    error={e(`brochures.${i}.url`)}
                  />
                </div>
              )}
            </Repeater>
          </FormSection>

          <FormSection id="fleet" title="Fleet" description="Aircraft offered for charter. Existing aircraft keep their id so enquiries stay linked.">
            <Repeater
              items={s.fleet}
              onChange={(v) => set("fleet", v)}
              create={() => ({ id: "", model: "", category: "Light Jet" as const, seats: "", rangeNm: "", speedKts: "", baseIcao: "", image: "", yearOfManufacture: "" })}
              max={50}
              addLabel="Add aircraft"
              itemLabel={(it, i) => it.model || `Aircraft ${i + 1}`}
              errorId="fleet-error"
              error={e("fleet")}
            >
              {(it, i, update) => {
                const p = `fleet.${i}`;
                return (
                  <div className="flex flex-col gap-3">
                    <Grid cols={3}>
                      <Input label="Model *" name={`${p}.model`} value={it.model} maxLength={100} onChange={(ev) => update({ model: ev.target.value })} error={e(`${p}.model`)} />
                      <Select label="Category *" name={`${p}.category`} value={it.category} onChange={(ev) => update({ category: ev.target.value as (typeof FLEET_CATEGORIES)[number] })} error={e(`${p}.category`)}>
                        {FLEET_CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                      <Input label="Base ICAO" name={`${p}.baseIcao`} value={it.baseIcao} maxLength={4} onChange={(ev) => update({ baseIcao: ev.target.value.toUpperCase() })} error={e(`${p}.baseIcao`)} />
                    </Grid>
                    <Grid cols={4}>
                      <Input label="Seats *" name={`${p}.seats`} type="number" inputMode="numeric" min={1} max={600} value={it.seats} onChange={(ev) => update({ seats: ev.target.value })} error={e(`${p}.seats`)} />
                      <Input label="Range (nm) *" name={`${p}.rangeNm`} type="number" inputMode="numeric" min={0} max={20000} value={it.rangeNm} onChange={(ev) => update({ rangeNm: ev.target.value })} error={e(`${p}.rangeNm`)} />
                      <Input label="Speed (kts) *" name={`${p}.speedKts`} type="number" inputMode="numeric" min={0} max={800} value={it.speedKts} onChange={(ev) => update({ speedKts: ev.target.value })} error={e(`${p}.speedKts`)} />
                      <Input label="Year built" name={`${p}.yearOfManufacture`} type="number" inputMode="numeric" min={1950} max={2100} value={it.yearOfManufacture} onChange={(ev) => update({ yearOfManufacture: ev.target.value })} error={e(`${p}.yearOfManufacture`)} />
                    </Grid>
                    <UploadField id={`${p}.image`} label="Photo" kind="image" value={it.image} onChange={(image) => update({ image })} error={e(`${p}.image`)} />
                  </div>
                );
              }}
            </Repeater>
          </FormSection>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24">
          {provider && (
            <Card title="Status">
              <div className="mb-3 flex items-center gap-2">
                <StatusPill status={provider.status} />
                {provider.publishedAt && <span className="text-xs text-muted">first published {formatDateTime(provider.publishedAt)}</span>}
              </div>
              {provider.status === "rejected" && provider.rejectionReason && (
                <p className="mb-3 rounded-xl bg-danger/5 px-3 py-2 text-sm text-danger">
                  <span className="font-semibold">Rejection reason:</span> {provider.rejectionReason}
                </p>
              )}
              <StatusActions
                provider={provider}
                onChanged={(updated, message) => {
                  setProvider(updated);
                  show({ status: "success", message });
                }}
                onDeleted={() => router.push("/admin/providers")}
                onError={(message) => show({ status: "error", message })}
              />
              {provider.status === "published" && (
                <a href={siteUrl(`/providers/${provider.slug}`)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                  View public profile <ExternalLink className="size-3.5" />
                </a>
              )}
            </Card>
          )}

          <Card title="Plan & ownership">
            <div className="flex flex-col gap-4">
              <Select label="Tier" name="tier" value={s.tier} onChange={(ev) => set("tier", ev.target.value as ProviderFormState["tier"])} error={e("tier")}>
                {PROVIDER_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}
                  </option>
                ))}
              </Select>
              <Toggle id="verified" label="Verified provider" description="Shows the verified badge on the listing." checked={s.verified} onChange={(v) => set("verified", v)} />
              <Input
                label="Owner email"
                name="ownerEmail"
                type="email"
                value={s.ownerEmail}
                maxLength={254}
                placeholder="provider@company.com"
                onChange={(ev) => set("ownerEmail", ev.target.value)}
                error={e("ownerEmail")}
                hint={provider?.owner ? `Managed by ${provider.owner.name}. Clear to make it staff-managed.` : "An existing provider account that should manage this listing."}
              />
              {mode === "create" && (
                <Select label="Initial status" name="status" value={s.status} onChange={(ev) => set("status", ev.target.value as "draft" | "published")}>
                  <option value="draft">Draft (not visible)</option>
                  <option value="published">Published</option>
                </Select>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 shadow-soft">
            <Button type="submit" loading={saving} className="w-full">
              {mode === "create" ? "Create listing" : "Save changes"}
            </Button>
            {mode === "edit" && dirty && <p className="text-center text-xs text-[#a16207]">You have unsaved changes.</p>}
          </div>
        </aside>
      </form>
    </>
  );
}
