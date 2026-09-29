"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormStatus, Input } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { otpSchema } from "@/lib/api/forms";
import { useAuth } from "@/lib/auth/auth-context";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { AuthHeading } from "./AuthHeading";
import { OtpInput } from "./OtpInput";
import { AUTH_INPUT, AUTH_SUBMIT } from "./shared";

const RESEND_COOLDOWN = 30;

export function VerifyEmailForm({ email: initialEmail }: { email?: string }) {
  const router = useRouter();
  const { verifyOtp, resendVerification } = useAuth();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState(initialEmail ?? "");
  // A code was just sent when the user arrives from signup, so start cooling down immediately.
  const [cooldown, setCooldown] = useState(initialEmail ? RESEND_COOLDOWN : 0);
  const [resend, setResend] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const { errors, submitting, result, handleSubmit, setErrors } = useZodForm(
    otpSchema,
    async (data) => {
      await verifyOtp(data.email, data.code);
      router.replace("/account");
    },
    { resetOnSuccess: false, transform: () => ({ email, code: code.replace(/\s/g, "") }) },
  );

  async function handleResend() {
    const parsed = otpSchema.shape.email.safeParse(email);
    if (!parsed.success) {
      setErrors({ email: parsed.error.issues[0]?.message ?? "Enter a valid email address" });
      return;
    }
    setResending(true);
    setResend(null);
    try {
      await resendVerification(parsed.data);
      setResend({ status: "success", message: "A new code is on its way — check your inbox." });
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setResend({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't resend the code. Please try again." });
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <AuthHeading
        centered
        icon="✉️"
        title="Check your email"
        subtitle={
          <>
            We sent a 6-digit verification code to
            <br />
            <strong className="font-bold break-all text-ink">{initialEmail || "your email address"}</strong>
          </>
        }
      />

      {!initialEmail && (
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="captain@airline.com"
          icon={<Mail className="size-4" aria-hidden />}
          className={AUTH_INPUT}
          wrapperClassName="pt-6"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
      )}
      {initialEmail && errors.email && <FieldError id="email-error" message={errors.email} />}

      <div className="pt-7">
        <OtpInput value={code} onChange={setCode} invalid={Boolean(errors.code)} disabled={submitting} describedBy={errors.code ? "code-error" : undefined} />
        <div className="text-center">
          <FieldError id="code-error" message={result.status === "error" ? undefined : errors.code} />
        </div>
      </div>

      {result.status === "error" && (
        <div className="mt-4">
          <FormStatus status="error" message={result.message} />
        </div>
      )}

      <Button type="submit" loading={submitting} className={`${AUTH_SUBMIT} mt-6`}>
        Verify &amp; Continue →
      </Button>

      <p className="pt-5 text-center text-sm text-subtle">
        Didn&apos;t receive the code?{" "}
        <button type="button" onClick={handleResend} disabled={cooldown > 0 || resending} className="font-bold text-brand hover:underline disabled:cursor-not-allowed disabled:text-subtle disabled:no-underline">
          {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending…" : "Resend code"}
        </button>
      </p>
      {resend && (
        <p role="status" className={`mt-2 text-center text-xs font-medium ${resend.status === "success" ? "text-[#15803d]" : "text-danger"}`}>
          {resend.message}
        </p>
      )}
      <p className="pt-3 text-center">
        <Link href="/signup" className="text-sm text-subtle hover:text-ink">
          ← Change email address
        </Link>
      </p>
    </form>
  );
}
