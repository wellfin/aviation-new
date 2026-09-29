"use client";

import { useState } from "react";
import { FormStatus, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ApiError, apiPost } from "@/lib/api/client";
import { contactSchema } from "@/lib/api/forms";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { DialCodeSelect } from "./DialCodeSelect";
import { EmailOtp } from "./EmailOtp";

export const CONTACT_SUBJECTS = ["General Enquiry", "Sales", "Partnerships", "Technical Support", "Press & Media", "Advertising", "Listings & Billing"] as const;

const field = "h-[52px] border-brand/20";

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** "Get In Touch" form (Figma 50:17659 / 696:81) — email must be OTP-verified before sending. */
export function ContactForm() {
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [otpReset, setOtpReset] = useState(0);

  const { errors, submitting, result, handleSubmit } = useZodForm(
    contactSchema,
    async (data) => {
      if (verifiedEmail !== data.email) {
        const message = "Please verify your email address with the OTP before sending.";
        throw new ApiError(422, { code: "EMAIL_NOT_VERIFIED", message, fieldErrors: { email: message } });
      }
      try {
        await apiPost("/contact", data);
      } catch (err) {
        // The verification expired or was already used: ask for a fresh code.
        if (err instanceof ApiError && err.body.code === "EMAIL_NOT_VERIFIED") {
          setVerifiedEmail(null);
          setOtpReset((n) => n + 1);
        }
        throw err;
      }
      setVerifiedEmail(null);
      setFormKey((k) => k + 1);
      return "Thanks for getting in touch — our team will reply within one business day.";
    },
    {
      transform: (fd) => {
        const mobile = str(fd, "mobile");
        return {
          name: `${str(fd, "firstName")} ${str(fd, "lastName")}`.trim(),
          email: str(fd, "email"),
          phone: mobile ? `${str(fd, "dialCode")} ${mobile}` : "",
          subject: str(fd, "subject"),
          message: str(fd, "message"),
        };
      },
    },
  );

  return (
    <form key={formKey} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" aria-label="Contact form">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="firstName" id="contact-first-name" autoComplete="given-name" placeholder="First Name" aria-label="First name" className={field} error={errors.name} />
        <Input name="lastName" id="contact-last-name" autoComplete="family-name" placeholder="Last Name" aria-label="Last name" className={field} />
      </div>

      <div className="flex gap-3">
        <DialCodeSelect id="contact-dial-code" className="h-[52px]" />
        <Input
          name="mobile"
          id="contact-mobile"
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

      <EmailOtp error={errors.email} onVerifiedChange={setVerifiedEmail} resetKey={otpReset} />

      <Select name="subject" id="contact-subject" aria-label="Subject" defaultValue={CONTACT_SUBJECTS[0]} className={field} error={errors.subject}>
        {CONTACT_SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>

      <Textarea name="message" id="contact-message" placeholder="Your message..." aria-label="Your message" rows={5} className="border-brand/20" error={errors.message} />

      <Button type="submit" loading={submitting} className="h-[52px] justify-start rounded-xl px-7 text-[15px]">
        {submitting ? "Sending…" : "Send Message"}
      </Button>

      {result.status !== "idle" && <FormStatus status={result.status} message={result.message} />}
    </form>
  );
}
