"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, FormStatus, Input } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth/auth-context";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { OtpInput } from "./OtpInput";
import { PasswordField, PasswordStrengthMeter } from "./PasswordField";
import { resetWithCodeSchema } from "./schema";
import { AUTH_INPUT, AUTH_SUBMIT } from "./shared";

export function ResetPasswordForm({ email: initialEmail }: { email?: string }) {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const { errors, submitting, result, handleSubmit } = useZodForm(
    resetWithCodeSchema,
    async ({ email, code: otp, password: pw }) => {
      await resetPassword(email, otp, pw);
      router.push("/login?reset=1");
    },
    {
      resetOnSuccess: false,
      transform: (fd) => ({
        email: fd.get("email"),
        code: code.replace(/\s/g, ""),
        password: fd.get("password"),
        confirmPassword: fd.get("confirmPassword"),
      }),
    },
  );

  return (
    <form onSubmit={handleSubmit} method="post" noValidate className="space-y-4 pt-7">
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="captain@airline.com"
        icon={<Mail className="size-4" aria-hidden />}
        className={AUTH_INPUT}
        defaultValue={initialEmail}
        error={errors.email}
        required
      />

      <div>
        <p className="mb-2 text-xs font-semibold tracking-[0.6px] text-muted uppercase" aria-hidden>
          Reset code
        </p>
        <OtpInput value={code} onChange={setCode} invalid={Boolean(errors.code)} disabled={submitting} describedBy={errors.code ? "code-error" : undefined} />
        <div className="text-center">
          <FieldError id="code-error" message={errors.code} />
        </div>
      </div>

      <div>
        <PasswordField
          label="New password"
          name="password"
          id="new-password"
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <PasswordStrengthMeter password={password} />
      </div>

      <PasswordField
        label="Confirm new password"
        name="confirmPassword"
        id="confirm-password"
        autoComplete="new-password"
        placeholder="Re-enter your new password"
        error={errors.confirmPassword}
        required
      />

      {result.status === "error" && <FormStatus status="error" message={result.message} />}

      <Button type="submit" loading={submitting} className={AUTH_SUBMIT}>
        Update Password →
      </Button>
    </form>
  );
}
