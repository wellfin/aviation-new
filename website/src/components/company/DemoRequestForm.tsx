"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, apiPost, registerMock } from "@/lib/api/client";
import { demoRequestSchema, workEmail } from "@/lib/api/forms";
import { MOCK_OTP } from "@/lib/auth/auth-context";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { publicConfig } from "@/lib/public-config";
import { Button } from "@/components/ui/Button";
import { FieldError, FormStatus, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { minToday } from "@/lib/dates";

const OTP_SEND_PATH = "/demo-requests/email-otp";
const OTP_VERIFY_PATH = "/demo-requests/email-otp/verify";
const RESEND_SECONDS = 60;

// Mock mode: accept only the shared demo code so the error path can be exercised too.
registerMock("POST", OTP_VERIFY_PATH, (body) => {
  const code = (body as { code?: string } | null)?.code;
  if (code !== MOCK_OTP) {
    throw new ApiError(400, { code: "INVALID_OTP", message: "That code is incorrect or has expired.", fieldErrors: { code: "Invalid code" } });
  }
  return { verified: true };
});

const DIAL_CODES = [
  { code: "+1", label: "United States / Canada (+1)" },
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+971", label: "United Arab Emirates (+971)" },
  { code: "+966", label: "Saudi Arabia (+966)" },
  { code: "+974", label: "Qatar (+974)" },
  { code: "+33", label: "France (+33)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+41", label: "Switzerland (+41)" },
  { code: "+31", label: "Netherlands (+31)" },
  { code: "+34", label: "Spain (+34)" },
  { code: "+39", label: "Italy (+39)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+852", label: "Hong Kong (+852)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+91", label: "India (+91)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+27", label: "South Africa (+27)" },
  { code: "+52", label: "Mexico (+52)" },
  { code: "+55", label: "Brazil (+55)" },
] as const;

const INTERESTS = [
  "Aviation directory & provider search",
  "Aviation tools (weather, NOTAMs, runways)",
  "Analytics dashboard",
  "Data licence & API",
  "Provider listing & membership",
  "Advertising",
  "Enterprise / team accounts",
] as const;

function withoutEmailError(errors: Record<string, string>): Record<string, string> {
  const next = { ...errors };
  delete next.email;
  return next;
}

type OtpState = { step: "idle" } | { step: "sent"; email: string } | { step: "verified"; email: string };

/** Splits the single "Full name" field into the first/last name the API expects. */
function toPayload(fd: FormData): Record<string, unknown> {
  const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
  const parts = (raw.fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const phone = (raw.phone ?? "").trim();
  return {
    firstName: parts.slice(0, -1).join(" ") || parts[0] || "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
    email: raw.email ?? "",
    company: raw.company ?? "",
    role: raw.role ?? "",
    phone: phone ? `${raw.dialCode ?? ""} ${phone}`.trim() : "",
    interest: raw.interest ?? "",
    preferredDate: raw.preferredDate ?? "",
    message: raw.message ?? "",
  };
}

export function DemoRequestForm() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<OtpState>({ step: "idle" });
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState<string>();
  const [otpBusy, setOtpBusy] = useState<"send" | "verify" | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const verified = otp.step === "verified" && otp.email === email.trim().toLowerCase();

  const { errors, submitting, result, handleSubmit, setErrors } = useZodForm(
    demoRequestSchema,
    async (data) => {
      if (!verified) {
        throw new ApiError(422, { code: "EMAIL_NOT_VERIFIED", message: "Please verify your work email before sending the request.", fieldErrors: { email: "Verify this email address with the one-time code" } });
      }
      try {
        await apiPost("/demo-requests", data);
      } catch (err) {
        // The verification expired or was already used: ask for a fresh code.
        if (err instanceof ApiError && err.body.code === "EMAIL_NOT_VERIFIED") setOtp({ step: "idle" });
        throw err;
      }
      setOtp({ step: "idle" });
      setEmail("");
      setCode("");
      return "Thanks — your demo request is in. An aviation specialist will contact you within one business day to schedule your session.";
    },
    { transform: toPayload },
  );

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  async function sendOtp() {
    const value = email.trim().toLowerCase();
    // Same rule as the form schema: a valid, professional (non-personal) address.
    const checked = workEmail.safeParse(value);
    if (!checked.success) {
      setErrors((e) => ({ ...e, email: checked.error.issues[0]?.message ?? "Enter a valid email address" }));
      return;
    }
    setErrors(withoutEmailError);
    setOtpError(undefined);
    setOtpBusy("send");
    try {
      await apiPost(OTP_SEND_PATH, { email: value });
      setOtp({ step: "sent", email: value });
      setCode("");
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setErrors((e) => ({ ...e, email: err instanceof ApiError ? (err.body.fieldErrors?.email ?? err.body.message) : "Couldn't send the code. Please try again." }));
    } finally {
      setOtpBusy(null);
    }
  }

  async function verifyOtp() {
    if (otp.step !== "sent") return;
    if (!/^\d{6}$/.test(code)) {
      setOtpError("Enter the 6-digit code");
      return;
    }
    setOtpError(undefined);
    setOtpBusy("verify");
    try {
      await apiPost(OTP_VERIFY_PATH, { email: otp.email, code });
      setOtp({ step: "verified", email: otp.email });
      setErrors(withoutEmailError);
    } catch (err) {
      setOtpError(err instanceof ApiError ? (err.body.fieldErrors?.code ?? err.body.message) : "Verification failed. Please try again.");
    } finally {
      setOtpBusy(null);
    }
  }

  const nameError = errors.firstName || errors.lastName ? "Please enter your first and last name" : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="fullName" label="Full name *" autoComplete="name" placeholder="Capt. James Anderson" error={nameError} />
        <Input name="company" label="Company name *" autoComplete="organization" placeholder="Global Air Charter Ltd" error={errors.company} />
      </div>

      <div>
        <Label htmlFor="demo-email">Work email *</Label>
        <div
          className={cn(
            "flex h-[52px] items-center overflow-hidden rounded-xl border bg-white transition focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15",
            errors.email ? "border-danger" : "border-line",
          )}
        >
          <input
            id="demo-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="james@globalaircharter.aero"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "demo-email-error" : undefined}
            className="h-full min-w-0 flex-1 bg-transparent px-4 text-[15px] text-ink outline-none placeholder:text-subtle"
          />
          {verified ? (
            <span className="mr-3 inline-flex items-center gap-1.5 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" aria-hidden /> Verified
            </span>
          ) : (
            <button
              type="button"
              onClick={sendOtp}
              disabled={otpBusy !== null || (otp.step === "sent" && otp.email === email.trim().toLowerCase() && resendIn > 0)}
              className="bg-brand-gradient h-full shrink-0 px-5 text-sm font-semibold tracking-[0.3px] text-white uppercase transition hover:brightness-110 disabled:opacity-60"
            >
              {otpBusy === "send" ? "Sending…" : otp.step === "sent" ? "Resend OTP" : "Send OTP"}
            </button>
          )}
        </div>
        <FieldError id="demo-email-error" message={errors.email} />
      </div>

      {otp.step === "sent" && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">
            Enter the 6-digit OTP sent to <span className="font-semibold text-ink">{otp.email}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label htmlFor="demo-otp" className="sr-only">
              One-time code
            </label>
            <input
              id="demo-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void verifyOtp();
                }
              }}
              placeholder="000000"
              aria-invalid={otpError ? true : undefined}
              aria-describedby={otpError ? "demo-otp-error" : undefined}
              className="h-12 w-[180px] rounded-xl border border-line bg-white text-center font-mono text-xl tracking-[8px] text-ink outline-none placeholder:text-subtle focus:border-brand focus:ring-3 focus:ring-brand/15 aria-invalid:border-danger"
            />
            <Button type="button" onClick={verifyOtp} loading={otpBusy === "verify"} className="h-12">
              Verify OTP
            </Button>
            <span className="text-xs text-subtle" aria-live="polite">
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Didn't get it? Use Resend OTP above."}
            </span>
          </div>
          <FieldError id="demo-otp-error" message={otpError} />
          {publicConfig.dataSource === "mock" && <p className="mt-2 text-xs text-subtle">Demo mode: use code {MOCK_OTP}.</p>}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Select name="dialCode" label="Country code" defaultValue="">
          <option value="">Select country...</option>
          {DIAL_CODES.map((d) => (
            <option key={d.code} value={d.code}>
              {d.label}
            </option>
          ))}
        </Select>
        <Input name="phone" label="Phone number" type="tel" autoComplete="tel-national" placeholder="20 7946 0000" error={errors.phone} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="role" label="Job title" autoComplete="organization-title" placeholder="Director of Operations" error={errors.role} />
        <Select name="interest" label="Main interest *" defaultValue="" error={errors.interest}>
          <option value="" disabled>
            Choose an option...
          </option>
          {INTERESTS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </Select>
      </div>

      {/* Past days are greyed out in the picker; the schema rejects a typed-in past date. */}
      <Input name="preferredDate" label="Preferred date" type="date" ref={minToday} error={errors.preferredDate} />

      <Textarea
        name="message"
        label="Message / requirements"
        rows={4}
        placeholder="Tell us about your specific requirements, team size, or areas you'd like the demo to focus on..."
        error={errors.message}
      />

      {result.status !== "idle" && <FormStatus status={result.status} message={result.message} />}

      <Button type="submit" loading={submitting} className="h-[52px] w-full text-base">
        {submitting ? "Sending request…" : "Request Demo →"}
      </Button>
    </form>
  );
}
