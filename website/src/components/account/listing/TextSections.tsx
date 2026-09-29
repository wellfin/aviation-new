"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useCategories } from "@/components/categories/CategoriesContext";
import type { Listing } from "../types";
import { countries, countryName } from "./countries";
import { EditorSection, move, PlanLock, RowControls, useSectionSave } from "./editor-kit";
import { aboutSchema, basicsSchema, contactSchema, socialsSchema } from "./schema";

export interface SectionProps {
  listing: Listing;
  onSaved: (l: Listing) => void;
}

/* ------------------------------------------------------------------ basics */

export function BasicsSection({ listing, onSaved }: SectionProps) {
  const { categories } = useCategories();
  const [v, setV] = useState({
    name: listing.name,
    category: listing.category as string,
    countryCode: listing.countryCode,
    city: listing.city,
    summary: listing.summary,
    locationsLabel: listing.locationsLabel ?? "",
    foundedYear: listing.foundedYear ? String(listing.foundedYear) : "",
    employees: listing.employees ?? "",
  });
  const { errors, saving, status, save } = useSectionSave(basicsSchema, onSaved);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const changesFleet = listing.fleet.length > 0 && !["charter-operator", "charter-broker"].includes(v.category);

  return (
    <EditorSection
      id="basics"
      title="Basics"
      description="Your company name, category and where you're based."
      saving={saving}
      status={status}
      onSubmit={() =>
        save({
          ...v,
          country: v.countryCode ? countryName(v.countryCode) : "",
          foundedYear: v.foundedYear.trim() === "" ? null : Number(v.foundedYear),
        })
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Company name" value={v.name} onChange={set("name")} error={errors.name} maxLength={120} required wrapperClassName="sm:col-span-2" />
        <Select name="category" label="Category" value={v.category} onChange={set("category")} error={errors.category}>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.longName}
            </option>
          ))}
        </Select>
        <Select name="countryCode" label="Country" value={v.countryCode} onChange={set("countryCode")} error={errors.countryCode ?? errors.country}>
          <option value="">Choose a country</option>
          {countries().map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input name="city" label="City" value={v.city} onChange={set("city")} error={errors.city} maxLength={80} required />
        <Input
          name="locationsLabel"
          label="Locations label"
          placeholder="e.g. 12 locations worldwide"
          value={v.locationsLabel}
          onChange={set("locationsLabel")}
          error={errors.locationsLabel}
          maxLength={60}
          hint="Optional. Shown on your profile header."
        />
        <Input name="foundedYear" label="Founded" type="number" inputMode="numeric" min={1900} max={2100} placeholder="e.g. 1998" value={v.foundedYear} onChange={set("foundedYear")} error={errors.foundedYear} />
        <Input name="employees" label="Employees" placeholder="e.g. 50-200" value={v.employees} onChange={set("employees")} error={errors.employees} maxLength={20} />
        <div className="sm:col-span-2">
          <Textarea
            name="summary"
            label="Short summary"
            value={v.summary}
            onChange={set("summary")}
            error={errors.summary}
            maxLength={300}
            className="min-h-[96px]"
            placeholder="One or two sentences shown on directory cards and search results."
          />
          <p className="mt-1 text-right text-xs text-subtle">{v.summary.length} / 300</p>
        </div>
      </div>
      {changesFleet && (
        <p className="rounded-xl bg-warning/8 px-3 py-2 text-xs text-[#a16207]">
          The aircraft fleet is only shown for {categories.filter((c) => ["charter-operator", "charter-broker"].includes(c.slug)).map((c) => c.name).join(" and ")} listings.
        </p>
      )}
    </EditorSection>
  );
}

/* ------------------------------------------------------------------ about */

export function AboutSection({ listing, onSaved }: SectionProps) {
  const [paras, setParas] = useState<string[]>(listing.about.length ? listing.about : [""]);
  const { errors, saving, status, save } = useSectionSave(aboutSchema, onSaved);

  return (
    <EditorSection
      id="about"
      title="About"
      description="Tell pilots and operators who you are. Up to 10 paragraphs."
      saving={saving}
      status={status}
      onSubmit={() => save({ about: paras.map((p) => p.trim()).filter(Boolean) })}
    >
      {errors.about && <p className="text-sm font-medium text-danger">{errors.about}</p>}
      <div className="space-y-4">
        {paras.map((p, i) => (
          <div key={i} className="flex gap-2">
            <Textarea
              name={`about-${i}`}
              label={`Paragraph ${i + 1}`}
              value={p}
              onChange={(e) => setParas((s) => s.map((x, j) => (j === i ? e.target.value : x)))}
              error={errors[`about.${i}`]}
              maxLength={2000}
              wrapperClassName="flex-1"
            />
            <div className="pt-6">
              <RowControls index={i} count={paras.length} label={`paragraph ${i + 1}`} onMove={(a, b) => setParas((s) => move(s, a, b))} onRemove={() => setParas((s) => (s.length > 1 ? s.filter((_, j) => j !== i) : [""]))} />
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" disabled={paras.length >= 10} onClick={() => setParas((s) => [...s, ""])}>
        <Plus className="size-4" aria-hidden /> Add paragraph
      </Button>
    </EditorSection>
  );
}

/* ------------------------------------------------------------------ contact */

export function ContactSection({ listing, onSaved }: SectionProps) {
  const [c, setC] = useState({
    phone: listing.contact.phone,
    email: listing.contact.email,
    website: listing.contact.website,
    address: listing.contact.address,
    fax: listing.contact.fax ?? "",
    location: listing.contact.location,
  });
  const { errors, saving, status, save } = useSectionSave(contactSchema, onSaved);
  const set = (k: keyof typeof c) => (e: { target: { value: string } }) => setC((s) => ({ ...s, [k]: e.target.value }));
  const err = (k: string) => errors[`contact.${k}`] ?? (k === "email" ? errors.contact : undefined);

  return (
    <EditorSection id="contact" title="Contact" description="At least an email or phone number is needed before review." saving={saving} status={status} onSubmit={() => save({ contact: c })}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="contact-email" label="Email" type="email" value={c.email} onChange={set("email")} error={err("email")} maxLength={254} />
        <Input name="contact-phone" label="Phone" type="tel" value={c.phone} onChange={set("phone")} error={err("phone")} maxLength={30} />
        <Input name="contact-website" label="Website" placeholder="www.example.com" value={c.website} onChange={set("website")} error={err("website")} maxLength={200} />
        <Input name="contact-fax" label="Fax" value={c.fax} onChange={set("fax")} error={err("fax")} maxLength={30} />
        <Input name="contact-location" label="Location" placeholder="e.g. Terminal 2, General Aviation Area" value={c.location} onChange={set("location")} error={err("location")} maxLength={120} />
        <Input name="contact-address" label="Address" value={c.address} onChange={set("address")} error={err("address")} maxLength={300} />
      </div>
    </EditorSection>
  );
}

/* ------------------------------------------------------------------ socials */

const SOCIALS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "x", label: "X (Twitter)" },
] as const;

export function SocialsSection({ listing, onSaved }: SectionProps) {
  const allowed = listing.limits.socials;
  const [s, setS] = useState({
    linkedin: listing.socials.linkedin ?? "",
    instagram: listing.socials.instagram ?? "",
    facebook: listing.socials.facebook ?? "",
    x: listing.socials.x ?? "",
  });
  const { errors, saving, status, save } = useSectionSave(socialsSchema, onSaved);

  return (
    <EditorSection
      id="socials"
      title="Social media"
      description="Links shown on your public profile."
      saving={saving}
      status={status}
      locked={!allowed}
      onSubmit={() => save({ socials: s })}
    >
      {!allowed && <PlanLock>Social media links are available on the Pro and Ultra Pro plans.</PlanLock>}
      <div className="grid gap-5 sm:grid-cols-2">
        {SOCIALS.map(({ key, label }) => (
          <Input
            key={key}
            name={`social-${key}`}
            label={label}
            type="url"
            placeholder="https://"
            value={s[key]}
            onChange={(e) => setS((p) => ({ ...p, [key]: e.target.value }))}
            error={errors[`socials.${key}`] ?? (key === "linkedin" ? errors.socials : undefined)}
            disabled={!allowed}
            maxLength={500}
          />
        ))}
      </div>
    </EditorSection>
  );
}
