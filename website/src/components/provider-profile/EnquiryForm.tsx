"use client";

import { Button } from "@/components/ui/Button";
import { FormResultStatus } from "@/components/forms/FormResultStatus";
import { FieldError, Input, Select, Textarea } from "@/components/ui/Field";
import { apiPost } from "@/lib/api/client";
import { enquirySchema } from "@/lib/api/forms";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { DialCodeSelect } from "@/components/contact/DialCodeSelect";

const control = "h-11 rounded-xl border-brand/20 text-[15px]";

/** Sidebar "Send Enquiry" card with the "Direct Call" link underneath. */
export function EnquiryForm({ providerSlug, providerName, services, phoneHref }: { providerSlug: string; providerName: string; services: string[]; phoneHref: string }) {
  const { errors, submitting, result, handleSubmit } = useZodForm(enquirySchema, async (data) => {
    await apiPost("/enquiries", data);
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
        <Input name="email" id="enq-email" type="email" aria-label="Email address" placeholder="Email Address" autoComplete="email" error={errors.email} className={control} />
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
        <Select name="service" id="enq-service" aria-label="Service" defaultValue="" error={errors.service} className={`${control} text-ink`}>
          <option value="" disabled>
            Select Service
          </option>
          {services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          {!services.some((s) => s.toLowerCase() === "other") && <option value="Other">Other</option>}
        </Select>
        <Textarea name="message" id="enq-message" aria-label="Message or requirements" placeholder="Message / Requirements" rows={4} error={errors.message} className="min-h-[100px] rounded-xl border-brand/20 text-[15px]" />
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
