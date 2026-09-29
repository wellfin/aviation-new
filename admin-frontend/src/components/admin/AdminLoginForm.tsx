"use client";

import { Lock, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input } from "@/components/ui/Field";
import { loginSchema } from "@/lib/api/forms";
import { useAuth } from "@/lib/auth/auth-context";
import { useZodForm } from "@/lib/hooks/useZodForm";

/** Only same-site relative paths are allowed as the post-login destination. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/admin";
}

export function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const destination = safeNext(params.get("next"));
  const { login, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace(destination);
  }, [loading, user, router, destination]);

  const { errors, submitting, result, handleSubmit } = useZodForm(
    loginSchema,
    async (data) => {
      await login(data.email, data.password, data.remember);
      router.replace(destination);
    },
    { resetOnSuccess: false, transform: (fd) => ({ email: fd.get("email"), password: fd.get("password"), remember: fd.get("remember") === "on" }) },
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
      {result.status === "error" && <FormStatus status="error" message={result.message} />}
      <Input label="Email" name="email" type="email" autoComplete="username" icon={<Mail className="size-4" />} error={errors.email} required />
      <Input label="Password" name="password" type="password" autoComplete="current-password" icon={<Lock className="size-4" />} error={errors.password} required />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="remember" className="size-4 accent-brand" /> Keep me signed in on this device
      </label>
      <Button type="submit" loading={submitting} className="mt-2 w-full">
        Sign in
      </Button>
    </form>
  );
}
