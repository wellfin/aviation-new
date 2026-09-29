"use client";

import { FileText, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import type { Brochure, Certification, ProviderService } from "@/lib/types";
import { formatBytes } from "../upload";
import { EditorSection, move, RowControls, UploadButton, UsageMeter, useSectionSave } from "./editor-kit";
import { brochuresSchema, certificationsSchema, SERVICE_ICONS, servicesSchema } from "./schema";
import type { SectionProps } from "./TextSections";

function RowCard({ title, controls, children }: { title: string; controls: ReactNode; children: ReactNode }) {
  return (
    <li className="rounded-xl border border-line bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">{title}</p>
        {controls}
      </div>
      {children}
    </li>
  );
}

function ListError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm font-medium text-danger">
      {message}
    </p>
  ) : null;
}

const ICON_LABEL: Record<(typeof SERVICE_ICONS)[number], string> = {
  plane: "Aircraft",
  "plane-takeoff": "Departure",
  fuel: "Fuel",
  sofa: "Lounge",
  "shield-check": "Security",
  warehouse: "Hangar",
  "concierge-bell": "Concierge",
  tag: "Pricing",
  settings: "Maintenance",
  "heart-pulse": "Medical",
};

/* ------------------------------------------------------------------ services */

type ServiceRow = { name: string; description: string; icon: string };

export function ServicesSection({ listing, onSaved }: SectionProps) {
  const [rows, setRows] = useState<ServiceRow[]>(listing.services.map((s: ProviderService) => ({ name: s.name, description: s.description, icon: s.icon || "plane" })));
  const { errors, saving, status, save } = useSectionSave(servicesSchema, onSaved);
  const update = (i: number, patch: Partial<ServiceRow>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <EditorSection
      id="services"
      title="Services"
      description="What you offer. Enquiry forms let customers pick one of these."
      meta={<UsageMeter used={rows.length} max={30} label="services" />}
      saving={saving}
      status={status}
      onSubmit={() => save({ services: rows.map((r) => ({ ...r, icon: (SERVICE_ICONS as readonly string[]).includes(r.icon) ? r.icon : "plane" })) })}
    >
      <ListError message={errors.services} />
      {rows.length === 0 && <p className="text-sm text-muted">No services yet. Add at least one before submitting for review.</p>}
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <RowCard
            key={i}
            title={r.name || `Service ${i + 1}`}
            controls={<RowControls index={i} count={rows.length} label={`service ${i + 1}`} onMove={(a, b) => setRows((x) => move(x, a, b))} onRemove={() => setRows((x) => x.filter((_, j) => j !== i))} />}
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              <Input name={`service-${i}-name`} label="Name" value={r.name} onChange={(e) => update(i, { name: e.target.value })} error={errors[`services.${i}.name`]} maxLength={80} />
              <Select name={`service-${i}-icon`} label="Icon" value={r.icon} onChange={(e) => update(i, { icon: e.target.value })} error={errors[`services.${i}.icon`]}>
                {SERVICE_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {ICON_LABEL[icon]}
                  </option>
                ))}
              </Select>
              <Textarea
                name={`service-${i}-description`}
                label="Description"
                value={r.description}
                onChange={(e) => update(i, { description: e.target.value })}
                error={errors[`services.${i}.description`]}
                maxLength={500}
                className="min-h-[80px]"
                wrapperClassName="sm:col-span-2"
              />
            </div>
          </RowCard>
        ))}
      </ul>
      <Button type="button" variant="ghost" size="sm" disabled={rows.length >= 30} onClick={() => setRows((r) => [...r, { name: "", description: "", icon: "plane" }])}>
        <Plus className="size-4" aria-hidden /> Add service
      </Button>
    </EditorSection>
  );
}

/* ------------------------------------------------------------------ certifications */

export function CertificationsSection({ listing, onSaved }: SectionProps) {
  const [rows, setRows] = useState<Certification[]>(listing.certifications);
  const { errors, saving, status, save } = useSectionSave(certificationsSchema, onSaved);
  const update = (i: number, patch: Partial<Certification>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <EditorSection
      id="certifications"
      title="Certifications"
      description="Approvals and accreditations such as IS-BAH, EASA Part-145 or ISO 9001."
      meta={<UsageMeter used={rows.length} max={20} label="items" />}
      saving={saving}
      status={status}
      onSubmit={() => save({ certifications: rows })}
    >
      <ListError message={errors.certifications} />
      {rows.length === 0 && <p className="text-sm text-muted">No certifications listed.</p>}
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <RowCard
            key={i}
            title={r.name || `Certification ${i + 1}`}
            controls={<RowControls index={i} count={rows.length} label={`certification ${i + 1}`} onMove={(a, b) => setRows((x) => move(x, a, b))} onRemove={() => setRows((x) => x.filter((_, j) => j !== i))} />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name={`cert-${i}-name`} label="Name" value={r.name} onChange={(e) => update(i, { name: e.target.value })} error={errors[`certifications.${i}.name`]} maxLength={120} />
              <Input name={`cert-${i}-issuer`} label="Issued by" value={r.issuer} onChange={(e) => update(i, { issuer: e.target.value })} error={errors[`certifications.${i}.issuer`]} maxLength={120} />
              <Input name={`cert-${i}-code`} label="Certificate number" value={r.code} onChange={(e) => update(i, { code: e.target.value })} error={errors[`certifications.${i}.code`]} maxLength={60} />
              <Input name={`cert-${i}-valid`} label="Valid until" type="date" value={r.validUntil} onChange={(e) => update(i, { validUntil: e.target.value })} error={errors[`certifications.${i}.validUntil`]} />
            </div>
          </RowCard>
        ))}
      </ul>
      <Button type="button" variant="ghost" size="sm" disabled={rows.length >= 20} onClick={() => setRows((r) => [...r, { name: "", issuer: "", code: "", validUntil: "" }])}>
        <Plus className="size-4" aria-hidden /> Add certification
      </Button>
    </EditorSection>
  );
}

/* ------------------------------------------------------------------ brochures */

export function BrochuresSection({ listing, onSaved }: SectionProps) {
  const [rows, setRows] = useState<Brochure[]>(listing.brochures);
  const { errors, saving, status, save } = useSectionSave(brochuresSchema, onSaved);
  const update = (i: number, patch: Partial<Brochure>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <EditorSection
      id="brochures"
      title="Brochures"
      description="Downloadable PDFs such as rate cards, capability statements or handling guides."
      meta={<UsageMeter used={rows.length} max={20} label="files" />}
      saving={saving}
      status={status}
      onSubmit={() => save({ brochures: rows })}
    >
      <ListError message={errors.brochures} />
      {rows.length === 0 && <p className="text-sm text-muted">No brochures uploaded.</p>}
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <RowCard
            key={i}
            title={r.title || `Brochure ${i + 1}`}
            controls={<RowControls index={i} count={rows.length} label={`brochure ${i + 1}`} onMove={(a, b) => setRows((x) => move(x, a, b))} onRemove={() => setRows((x) => x.filter((_, j) => j !== i))} />}
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Input name={`brochure-${i}-title`} label="Title" value={r.title} onChange={(e) => update(i, { title: e.target.value })} error={errors[`brochures.${i}.title`]} maxLength={150} />
              <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-brand hover:bg-brand/5">
                <FileText className="size-4" aria-hidden />
                {r.fileType}
                {r.sizeLabel ? ` · ${r.sizeLabel}` : ""}
              </a>
            </div>
            {errors[`brochures.${i}.url`] && <p className="mt-1 text-xs text-danger">{errors[`brochures.${i}.url`]}</p>}
          </RowCard>
        ))}
      </ul>
      <UploadButton
        kind="document"
        label="Upload PDF brochure"
        disabled={rows.length >= 20}
        onUploaded={(f) =>
          setRows((r) => [...r, { title: f.originalName.replace(/\.pdf$/i, "").slice(0, 150) || "Brochure", fileType: "PDF", sizeLabel: formatBytes(f.size), url: f.url }])
        }
      />
    </EditorSection>
  );
}
