"use client";

import { Button } from "@/components/ui/Button";
import { FormResultStatus } from "@/components/forms/FormResultStatus";
import { FieldError, Input, Textarea } from "@/components/ui/Field";
import { apiPost } from "@/lib/api/client";
import { enquirySchema } from "@/lib/api/forms";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { DialCodeSelect } from "@/components/contact/DialCodeSelect";
import { EmailOtp, ENQUIRY_OTP } from "@/components/contact/EmailOtp";
import { useEmailVerification } from "@/components/contact/useEmailVerification";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { useState } from "react";

const control = "h-11 rounded-xl border-brand/20 text-[15px]";
const LABEL = "mb-2 block font-mono text-[11px] font-medium tracking-[0.18em] text-subtle uppercase";

/** "I need": the provider's services as pills; pick one or more. Sent as one comma-separated `service` value. */
function ServicePills({ services, error }: { services: string[]; error?: string }) {
  const options = services.some((s) => s.toLowerCase().startsWith("other")) ? services : [...services, "Other"];
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (s: string) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  return (
    <fieldset aria-describedby={error ? "enq-service-error" : undefined}>
      <legend className={LABEL}>I need</legend>
      <input type="hidden" name="service" value={picked.join(", ")} />
      <div className="flex flex-wrap gap-2">
        {options.map((s) => {
          const on = picked.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-[13px] leading-4 font-medium transition",
                on ? "bg-brand-gradient border-transparent text-white" : "border-brand/25 text-ink hover:border-brand",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
      <FieldError id="enq-service-error" message={error} />
    </fieldset>
  );
}

/** Sidebar "Send Enquiry" card with the "Direct Call" link underneath. */
export function EnquiryForm({ providerSlug, providerName, services, phoneHref }: { providerSlug: string; providerName: string; services: string[]; phoneHref: string }) {
  const otp = useEmailVerification();
  const { user } = useAuth();
  const { errors, submitting, result, handleSubmit } = useZodForm(enquirySchema, async (data) => {
    await otp.submitVerified(data.email, () => apiPost("/enquiries", data));
    return `Thanks — your enquiry has been sent to ${providerName}. They usually reply within one business day.`;
  });

  return (
    <section aria-labelledby="enquiry-heading" className="rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgba(11,31,58,0.08),0_1px_2px_rgba(11,31,58,0.04)]">
      <h2 id="enquiry-heading" className="text-base font-bold text-ink">
        Send Enquiry
      </h2>
      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="providerSlug" value={providerSlug} />
        <Input name="name" id="enq-name" aria-label="Your name" placeholder="Your Name" autoComplete="name" error={errors.name} className={control} />
        {/* A signed-in user's own verified account email needs no code (the API applies the same rule). */}
        <EmailOtp
          key={otp.mountKey}
          {...otp.fieldProps}
          endpoints={ENQUIRY_OTP}
          id="enq-email"
          error={errors.email}
          trustedEmail={user?.emailVerified ? user.email : undefined}
          fieldClassName="h-11 pl-3.5"
        />
        <div>
          <div className="flex gap-3">
            <DialCodeSelect id="enq-dial" className="h-11" />
            <Input
              name="phone"
              id="enq-phone"
              type="tel"
              aria-label="Phone number"
              placeholder="Phone Number"
              autoComplete="tel-national"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? "enq-phone-error-msg" : undefined}
              wrapperClassName="min-w-0 flex-1"
              className={control}
            />
          </div>
          <FieldError id="enq-phone-error-msg" message={errors.phone} />
        </div>
        <ServicePills services={services} error={errors.service} />
        <div>
          <label htmlFor="enq-message" className={LABEL}>
            Message
          </label>
          <Textarea
            name="message"
            id="enq-message"
            placeholder="What you need, and anything already decided"
            rows={4}
            error={errors.message}
            className="min-h-[100px] rounded-xl border-brand/20 text-[15px]"
          />
        </div>
        <FormResultStatus result={result} />
        <Button type="submit" loading={submitting} className="mt-2 h-12 w-full rounded-full text-[15px]">
          Send Enquiry
        </Button>
        <a
          href={phoneHref}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full border-[1.5px] border-success text-[13px] font-semibold text-success transition hover:bg-success/5"
        >
          <span aria-hidden>📞</span> Direct Call
        </a>
      </form>
    </section>
  );
}
