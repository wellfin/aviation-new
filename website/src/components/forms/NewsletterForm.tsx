"use client";

import { apiPost } from "@/lib/api/client";
import { newsletterSchema } from "@/lib/api/forms";
import { useZodForm } from "@/lib/hooks/useZodForm";

export function NewsletterForm() {
  const { errors, submitting, result, handleSubmit } = useZodForm(newsletterSchema, async (data) => {
    const res = await apiPost<{ message?: string } | undefined>("/newsletter/subscriptions", { ...data, source: "footer" });
    return res?.message ?? "Thanks! Please check your inbox to confirm your subscription.";
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full md:w-auto">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "newsletter-error" : undefined}
          className="h-11 w-full rounded-xl border border-white/12 bg-white/6 px-4 text-[15px] text-white placeholder:text-subtle outline-none focus:border-brand-cyan sm:w-[260px]"
        />
        <button type="submit" disabled={submitting} className="bg-brand-gradient h-11 rounded-xl px-5 text-[13px] font-semibold text-white disabled:opacity-60">
          {submitting ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      {errors.email && (
        <p id="newsletter-error" role="alert" className="mt-2 text-xs text-[#fca5a5]">
          {errors.email}
        </p>
      )}
      {result.status !== "idle" && (
        <p role="status" className={result.status === "success" ? "mt-2 text-xs text-success" : "mt-2 text-xs text-[#fca5a5]"}>
          {result.message}
        </p>
      )}
    </form>
  );
}
