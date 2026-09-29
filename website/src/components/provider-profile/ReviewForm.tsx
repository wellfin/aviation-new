"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormResultStatus } from "@/components/forms/FormResultStatus";
import { FieldError, FormStatus, Input, Textarea } from "@/components/ui/Field";
import { apiPost } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { cn } from "@/lib/utils";
import { Dialog } from "./Dialog";
import { reviewSchema } from "./schema";

const RATING_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

function RatingInput({ error }: { error?: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-semibold tracking-[0.6px] text-muted uppercase">Your Rating *</legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
            <input type="radio" name="rating" value={n} checked={value === n} onChange={() => setValue(n)} className="peer sr-only" aria-describedby={error ? "rating-error" : undefined} />
            <span className="sr-only">
              {n} star{n > 1 ? "s" : ""} — {RATING_LABELS[n - 1]}
            </span>
            <Star
              className={cn("size-8 rounded transition peer-focus-visible:outline-2 peer-focus-visible:outline-brand", n <= shown ? "fill-warning text-warning" : "fill-line text-line")}
              aria-hidden
            />
          </label>
        ))}
        {shown > 0 && <span className="ml-2 text-sm font-semibold text-muted">{RATING_LABELS[shown - 1]}</span>}
      </div>
      <FieldError id="rating-error" message={error} />
    </fieldset>
  );
}

function ReviewFormBody({ providerSlug, onDone }: { providerSlug: string; onDone: () => void }) {
  const next = `/providers/${providerSlug}?tab=reviews`;
  const { errors, submitting, result, handleSubmit } = useZodForm(
    reviewSchema,
    async (data) => {
      await apiPost(`/providers/${providerSlug}/reviews`, data);
      return "Thank you! Your review has been submitted and will appear once our team has checked it.";
    },
    { resetOnSuccess: false },
  );

  if (result.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormStatus status="success" message={result.message} />
        <Button type="button" variant="outline" onClick={onDone} className="self-end">
          Close
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <RatingInput error={errors.rating} />
      <Input label="Review Title *" name="title" id="review-title" maxLength={120} placeholder="Sum up your experience" error={errors.title} />
      <Textarea label="Your Review *" name="body" id="review-body" rows={5} maxLength={3000} placeholder="What went well? What could be better?" error={errors.body} />
      <Input label="Your Role" name="role" id="review-role" maxLength={120} placeholder="e.g. Chief Pilot, Flight Dispatcher" error={errors.role} />
      <p className="text-xs text-subtle">Reviews are checked by our team before they are published.</p>
      {result.status === "error" && <FormResultStatus result={result} nextPath={next} />}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Submit Review
        </Button>
      </div>
    </form>
  );
}

/** "Share Your Experience" button + review dialog. Only signed-in users can post. */
export function ShareExperience({ providerSlug, providerName }: { providerSlug: string; providerName: string }) {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const next = encodeURIComponent(`/providers/${providerSlug}?tab=reviews`);

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
        {loading ? (
          <p className="py-6 text-center text-sm text-muted">Checking your session…</p>
        ) : user ? (
          <ReviewFormBody providerSlug={providerSlug} onDone={() => setOpen(false)} />
        ) : (
          <div className="py-2 text-center">
            <p className="text-base font-bold text-ink">Log in to write a review</p>
            <p className="mt-1 text-sm text-muted">Reviews are tied to verified accounts so operators can trust them.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <ButtonLink href={`/login?next=${next}`}>Log in</ButtonLink>
              <ButtonLink href={`/signup?next=${next}`} variant="outline">
                Create account
              </ButtonLink>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
