"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormStatus, Input } from "@/components/ui/Field";
import { forgotPasswordSchema } from "@/lib/api/forms";
import { useAuth } from "@/lib/auth/auth-context";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { AUTH_INPUT, AUTH_SUBMIT } from "./shared";

export function ForgotPasswordForm() {
  const { requestPasswordReset } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const { errors, submitting, result, handleSubmit } = useZodForm(
    forgotPasswordSchema,
    async ({ email }) => {
      await requestPasswordReset(email);
      setSentTo(email);
    },
    { resetOnSuccess: false },
  );

  if (sentTo) {
    // Deliberately neutral — never reveal whether the email is registered.
    return (
      <div className="space-y-4 pt-7">
        <FormStatus status="success" message="If an account exists for that email, we've sent a 6-digit reset code. Check your inbox (and spam folder)." />
        <ButtonLink href={`/reset-password?email=${encodeURIComponent(sentTo)}`} className={AUTH_SUBMIT}>
          Enter reset code →
        </ButtonLink>
        <button type="button" onClick={() => setSentTo(null)} className="block w-full text-center text-sm text-subtle hover:text-ink">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="pt-7">
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="captain@airline.com"
        icon={<Mail className="size-4" aria-hidden />}
        className={AUTH_INPUT}
        error={errors.email}
        required
      />
      {result.status === "error" && (
        <div className="mt-4">
          <FormStatus status="error" message={result.message} />
        </div>
      )}
      <Button type="submit" loading={submitting} className={`${AUTH_SUBMIT} mt-4`}>
        Send Reset Code →
      </Button>
    </form>
  );
}
