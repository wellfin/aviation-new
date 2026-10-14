"use client";

import { User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { EmailOtp, type OtpEndpoints } from "@/components/contact/EmailOtp";
import { useEmailVerification } from "@/components/contact/useEmailVerification";
import { Button } from "@/components/ui/Button";
import { FieldError, FormStatus, Input, Label, Textarea } from "@/components/ui/Field";
import { ApiError, type ApiErrorBody } from "@/lib/api/client";
import { publicConfig } from "@/lib/public-config";
import { cn } from "@/lib/utils";
import { Dialog } from "./Dialog";

const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PHOTO_MAX_MB = 5;

/** Posts the testimonial as multipart (fields + optional photo) and returns the API's error, if any. */
async function sendTestimonial(slug: string, data: FormData): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${publicConfig.apiBaseUrl}/api/v1/providers/${encodeURIComponent(slug)}/testimonials`, { method: "POST", credentials: "include", body: data });
  } catch {
    throw new ApiError(0, { code: "NETWORK", message: "We couldn't send your testimonial. Check your connection and try again." });
  }
  if (res.ok) return;
  const payload = (await res.json().catch(() => null)) as { error?: ApiErrorBody } | null;
  throw new ApiError(res.status, payload?.error ?? { code: "FAILED", message: "We couldn't send your testimonial. Please try again." });
}

/** "Your Rating": five numbered circles, 5 (best) first, as drawn. */
function RatingCircles({ value, onChange, error }: { value: number; onChange: (n: number) => void; error?: string }) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-semibold tracking-[0.6px] text-muted uppercase">Your Rating *</legend>
      <div className="flex gap-2" role="radiogroup" aria-describedby={error ? "rating-error" : undefined}>
        {[5, 4, 3, 2, 1].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} out of 5`}
            onClick={() => onChange(n)}
            className={cn(
              "flex size-9 items-center justify-center rounded-full border text-sm font-semibold transition",
              value === n ? "border-brand bg-brand/10 text-brand" : "border-line text-ink hover:border-brand/50",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <FieldError id="rating-error" message={error} />
    </fieldset>
  );
}

function TestimonialForm({ providerSlug, otpEndpoints, onDone }: { providerSlug: string; otpEndpoints: OtpEndpoints; onDone: () => void }) {
  const otp = useEmailVerification();
  const [rating, setRating] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function choosePhoto(file: File | undefined) {
    setErrors((e) => ({ ...e, photo: "" }));
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_MB * 1024 * 1024) {
      setErrors((e) => ({ ...e, photo: `Use a PNG, JPG or WebP photo up to ${PHOTO_MAX_MB} MB.` }));
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const next: Record<string, string> = {};
    if (name.length < 2) next.name = "Please enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address";
    if (rating < 1) next.rating = "Please choose a rating";
    if (body.length < 20) next.body = "Please write at least 20 characters";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    const data = new FormData();
    data.set("name", name);
    data.set("email", email);
    const company = String(form.get("company") ?? "").trim();
    if (company) data.set("company", company);
    data.set("rating", String(rating));
    data.set("body", body);
    data.set("website", String(form.get("website") ?? ""));
    if (photo) data.set("photo", photo);

    setSubmitting(true);
    try {
      await otp.submitVerified(email, () => sendTestimonial(providerSlug, data));
      setDone(true);
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      if (body?.fieldErrors) setErrors(body.fieldErrors);
      setFormError(body?.message ?? "We couldn't send your testimonial. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <FormStatus status="success" message="Thank you! Your testimonial has been sent and will appear once our team has reviewed it." />
        <Button type="button" variant="outline" onClick={onDone} className="self-end">
          Close
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 text-left">
      {/* Honeypot: hidden from people, bots fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Input label="Your Name *" name="name" id="tm-name" maxLength={100} autoComplete="name" error={errors.name} />
      <div>
        <Label htmlFor="tm-email">Your Email *</Label>
        <EmailOtp key={otp.mountKey} {...otp.fieldProps} endpoints={otpEndpoints} id="tm-email" error={errors.email} placeholder="" layout="panel" />
      </div>
      <Input label="Company (Optional)" name="company" id="tm-company" maxLength={120} autoComplete="organization" error={errors.company} />
      <div>
        <Label htmlFor="tm-photo">Your Photo (Optional)</Label>
        <div className="flex items-center gap-3">
          <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-subtle" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
            {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <User className="size-5" />}
          </span>
          <label htmlFor="tm-photo" className="flex h-11 flex-1 cursor-pointer items-center gap-2 rounded-xl border border-line px-4 text-sm text-ink transition hover:border-brand">
            ⬆ {photo ? photo.name : "Upload your photo"}
          </label>
          <input id="tm-photo" type="file" accept={PHOTO_TYPES.join(",")} className="sr-only" onChange={(e) => choosePhoto(e.target.files?.[0])} />
        </div>
        <p className="mt-1 text-xs text-subtle">PNG, JPG or WebP up to {PHOTO_MAX_MB}MB</p>
        <FieldError id="tm-photo-error" message={errors.photo} />
      </div>
      <RatingCircles
        value={rating}
        onChange={(n) => {
          setRating(n);
          setErrors((e) => ({ ...e, rating: "" }));
        }}
        error={errors.rating}
      />
      <Textarea label="Your Testimonial *" name="body" id="tm-body" rows={4} maxLength={3000} placeholder="Share your experience…" error={errors.body} />
      <p className="border-t border-line pt-3 text-xs text-muted">
        <strong className="font-semibold text-ink">Note:</strong> Your testimonial will be reviewed by our team before being published on our website.
      </p>
      {formError && <FormStatus status="error" message={formError} />}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Submit Testimonial
        </Button>
      </div>
    </form>
  );
}

/** "Share Your Experience" button + testimonial dialog (Figma). Visitors verify their email; no account needed. */
export function ShareExperience({ providerSlug, providerName }: { providerSlug: string; providerName: string }) {
  const [open, setOpen] = useState(false);
  const otpEndpoints: OtpEndpoints = { send: `/providers/${providerSlug}/reviews/email-otp`, verify: `/providers/${providerSlug}/reviews/email-otp/verify` };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="mt-6 inline-flex h-12 items-center rounded-full bg-white px-8 text-base font-bold text-[#10acf9] shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5"
      >
        Share Your Experience
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Share Your Experience" subtitle={providerName} className="max-w-[560px]">
        {open && <TestimonialForm providerSlug={providerSlug} otpEndpoints={otpEndpoints} onDone={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}
