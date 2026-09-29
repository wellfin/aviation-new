"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { loginSchema } from "@/lib/api/forms";
import { useAuth } from "@/lib/auth/auth-context";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { PasswordField } from "./PasswordField";
import { AUTH_INPUT, AUTH_SUBMIT, safeNextPath } from "./shared";
import { SocialButtons } from "./SocialButtons";

export function LoginForm({ next, notice, error }: { next?: string; notice?: string; error?: string }) {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const destination = safeNextPath(next);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // Already signed in (e.g. back button) — skip the form.
  useEffect(() => {
    if (!loading && user) router.replace(destination);
  }, [loading, user, router, destination]);

  const { errors, submitting, result, handleSubmit } = useZodForm(
    loginSchema,
    async (data) => {
      setUnverifiedEmail(null);
      try {
        await login(data.email, data.password, data.remember);
      } catch (err) {
        if (err instanceof ApiError && err.body.code === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(data.email);
        throw err;
      }
      router.replace(destination);
    },
    {
      resetOnSuccess: false,
      transform: (fd) => ({ email: fd.get("email"), password: fd.get("password"), remember: fd.get("remember") === "on" }),
    },
  );

  return (
    <form onSubmit={handleSubmit} method="post" noValidate className="pt-8">
      {notice && (
        <div className="mb-4">
          <FormStatus status="success" message={notice} />
        </div>
      )}
      {error && result.status === "idle" && (
        <div className="mb-4">
          <FormStatus status="error" message={error} />
        </div>
      )}
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

      <div className="pt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-xs font-semibold tracking-[0.6px] text-muted uppercase">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordField name="password" id="password" autoComplete="current-password" placeholder="Enter your password" error={errors.password} required />
      </div>

      <label className="mt-4 flex w-fit cursor-pointer items-center gap-2.5 text-sm text-muted">
        <input type="checkbox" name="remember" className="size-4 rounded accent-brand" />
        Remember me for 30 days
      </label>

      {result.status === "error" && (
        <div className="mt-4 space-y-2">
          <FormStatus status="error" message={result.message} />
          {unverifiedEmail && (
            <Link href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`} className="block text-sm font-bold text-brand hover:underline">
              Verify your email now →
            </Link>
          )}
        </div>
      )}

      <Button type="submit" loading={submitting} className={`${AUTH_SUBMIT} mt-4`}>
        Sign In →
      </Button>

      <SocialButtons />
    </form>
  );
}
