"use client";

import { apiPost } from "@/lib/api/client";
import { newsletterSchema } from "@/lib/api/forms";
import { useZodForm } from "@/lib/hooks/useZodForm";

/** Light sidebar newsletter signup (the shared NewsletterForm is styled for the dark footer). */
export function NewsletterCard({ id = "news-newsletter" }: { id?: string }) {
  const { errors, submitting, result, handleSubmit } = useZodForm(newsletterSchema, async (data) => {
    const res = await apiPost<{ message?: string } | undefined>("/newsletter/subscriptions", { ...data, source: "news-sidebar" });
    return res?.message ?? "Thanks! Please check your inbox to confirm your subscription.";
  });

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
      <h2 id={`${id}-title`} className="text-base leading-6 font-extrabold text-ink">
        Newsletter
      </h2>
      <p className="py-4 text-sm leading-5 text-muted">Weekly aviation intelligence delivered to your inbox.</p>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${id}-error` : undefined}
          className="h-11 w-full rounded-xl border border-brand/20 bg-white px-4 text-[15px] text-ink outline-none placeholder:text-subtle focus:border-brand focus:ring-3 focus:ring-brand/15 aria-invalid:border-danger"
        />
        {errors.email && (
          <p id={`${id}-error`} role="alert" className="-mt-1 text-xs font-medium text-danger">
            {errors.email}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand-gradient h-11 rounded-3xl px-7 text-left text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Subscribing…" : "Subscribe"}
        </button>
        {result.status !== "idle" && (
          <p role="status" className={result.status === "success" ? "text-xs font-medium text-[#15803d]" : "text-xs font-medium text-danger"}>
            {result.message}
          </p>
        )}
      </form>
    </section>
  );
}
