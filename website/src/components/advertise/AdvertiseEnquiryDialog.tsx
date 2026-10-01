"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { DialCodeSelect } from "@/components/contact/DialCodeSelect";
import { ADVERTISING_OTP, EmailOtp } from "@/components/contact/EmailOtp";
import { useEmailVerification } from "@/components/contact/useEmailVerification";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input, Select, Textarea } from "@/components/ui/Field";
import { apiPost } from "@/lib/api/client";
import { advertiseSchema } from "@/lib/api/forms";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { CUSTOM_PACKAGE, type AdFormat } from "./formats";

const field = "border-brand/20";

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * "Send Enquiry" modal (Figma 643:5869 / 905:18113). Native <dialog> gives focus
 * trapping, Esc-to-close and a backdrop for free.
 */
/** Mounted only while open; opens itself as a modal on mount. */
export function AdvertiseEnquiryDialog({ placement, formats, onClose }: { placement: string; formats: AdFormat[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const otp = useEmailVerification();

  const { errors, submitting, result, handleSubmit } = useZodForm(
    advertiseSchema,
    async (data) => {
      await otp.submitVerified(data.email, () => apiPost("/advertising/enquiries", data));
      return "Thanks! Our media team will send your advertising package within one business day.";
    },
    {
      transform: (fd) => {
        const mobile = str(fd, "mobile");
        return {
          name: `${str(fd, "firstName")} ${str(fd, "lastName")}`.trim(),
          email: str(fd, "email"),
          company: str(fd, "company"),
          phone: mobile ? `${str(fd, "dialCode")} ${mobile}` : "",
          placement: str(fd, "placement"),
          message: str(fd, "message"),
        };
      },
    },
  );

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="advertise-enquiry-title"
      className="m-auto w-[calc(100vw-32px)] max-w-[540px] rounded-3xl bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop:bg-navy-950/60 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h2 id="advertise-enquiry-title" className="text-xl leading-7 font-bold text-ink">
            Send Enquiry
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-lg bg-[#f1f5f9] text-ink transition hover:bg-line">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="firstName" id="adv-first-name" autoComplete="given-name" placeholder="First Name" aria-label="First name" className={field} error={errors.name} />
            <Input name="lastName" id="adv-last-name" autoComplete="family-name" placeholder="Last Name" aria-label="Last name" className={field} />
          </div>
          <Input name="company" id="adv-company" autoComplete="organization" placeholder="Company" aria-label="Company" className={field} error={errors.company} />
          <EmailOtp key={otp.mountKey} {...otp.fieldProps} endpoints={ADVERTISING_OTP} id="adv-email" error={errors.email} fieldClassName="h-12" />
          <div className="flex gap-3">
            <DialCodeSelect id="adv-dial-code" />
            <Input
              name="mobile"
              id="adv-mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="Mobile number"
              aria-label="Mobile number"
              wrapperClassName="flex-1 min-w-0"
              className={field}
              error={errors.phone}
            />
          </div>
          <Select name="placement" id="adv-placement" aria-label="Ad format" defaultValue={placement} className={field} error={errors.placement}>
            <option value={CUSTOM_PACKAGE.id}>{CUSTOM_PACKAGE.title}</option>
            {formats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </Select>
          <Textarea name="message" id="adv-message" placeholder="Additional requirements or questions..." aria-label="Additional requirements or questions" rows={4} className={`${field} min-h-[100px]`} error={errors.message} />
          <Button type="submit" loading={submitting} className="mt-2 h-[52px] w-full rounded-3xl text-[15px]">
            {submitting ? "Sending…" : "Send Enquiry"}
          </Button>
          {result.status !== "idle" && <FormStatus status={result.status} message={result.message} />}
        </form>
      </div>
    </dialog>
  );
}
