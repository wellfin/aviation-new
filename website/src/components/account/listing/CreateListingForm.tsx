"use client";

import { Building2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Card } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input, Select, Textarea } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { fieldErrors } from "@/lib/api/forms";
import { useCategories } from "@/components/categories/CategoriesContext";
import { useAccount } from "../AccountShell";
import type { Listing } from "../types";
import { countries, countryName } from "./countries";
import { createSchema } from "./schema";

export function CreateListingForm({ onCreated }: { onCreated: (l: Listing) => void }) {
  const { profile } = useAccount();
  const { categories } = useCategories();
  const [v, setV] = useState({ name: profile?.company ?? "", category: "", countryCode: "", city: "", summary: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = createSchema.safeParse({ ...v, country: v.countryCode ? countryName(v.countryCode) : "" });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setError(null);
    setSubmitting(true);
    try {
      onCreated(await apiRequest<Listing>("POST", "/me/listing", parsed.data));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body.fieldErrors) setErrors(err.body.fieldErrors);
        setError(err.body.message);
      } else setError("Couldn't create your listing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="mb-6 flex items-start gap-4">
        <span className="bg-brand-gradient flex size-12 shrink-0 items-center justify-center rounded-2xl text-white">
          <Building2 className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink">Create your listing</h2>
          <p className="mt-1 text-sm text-muted">
            Start with the basics — you can add services, airports, photos and more next. Your listing stays a private draft until you submit it for review.
          </p>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Company name" value={v.name} onChange={set("name")} error={errors.name} maxLength={120} required wrapperClassName="sm:col-span-2" />
        <Select name="category" label="Category" value={v.category} onChange={set("category")} error={errors.category}>
          <option value="">Choose a category</option>
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
        <div className="sm:col-span-2">
          <Textarea
            name="summary"
            label="Short summary"
            placeholder="e.g. Full-service FBO at London Luton with 24/7 handling, fuel and crew lounge."
            value={v.summary}
            onChange={set("summary")}
            error={errors.summary}
            maxLength={300}
            className="min-h-[96px]"
          />
          <p className="mt-1 text-right text-xs text-subtle">{v.summary.length} / 300</p>
        </div>
        {error && (
          <div className="sm:col-span-2">
            <FormStatus status="error" message={error} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" loading={submitting}>
            Create draft listing
          </Button>
        </div>
      </form>
    </Card>
  );
}
