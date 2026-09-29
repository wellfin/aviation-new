"use client";

import { LogOut, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, PageHeader } from "@/components/admin/ui";
import { PasswordField, PasswordStrengthMeter } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";
import { FormStatus } from "@/components/ui/Field";
import { apiRequest } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { changePasswordSchema } from "./schema";

export function SecurityForm() {
  const router = useRouter();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const { errors, submitting, result, handleSubmit } = useZodForm(changePasswordSchema, async ({ currentPassword, newPassword }) => {
    await apiRequest("POST", "/auth/change-password", { currentPassword, newPassword });
    setPassword("");
    return "Password changed. Every other device has been signed out; this one stays signed in.";
  });

  async function signOut() {
    setSigningOut(true);
    await logout();
    router.push("/");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Security" description="Keep your account safe with a strong, unique password." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card title="Change password">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <PasswordField label="Current password" name="currentPassword" id="current-password" autoComplete="current-password" error={errors.currentPassword} required />
            <div>
              <PasswordField
                label="New password"
                name="newPassword"
                id="new-password"
                autoComplete="new-password"
                placeholder="Min. 8 characters, a letter and a number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.newPassword}
                required
                maxLength={128}
              />
              <PasswordStrengthMeter password={password} />
            </div>
            <PasswordField label="Confirm new password" name="confirmPassword" id="confirm-password" autoComplete="new-password" error={errors.confirmPassword} required maxLength={128} />
            {result.status !== "idle" && <FormStatus status={result.status} message={result.message} />}
            <Button type="submit" loading={submitting}>
              Update password
            </Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/8 text-brand">
                <MonitorSmartphone className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-bold text-ink">Signed in elsewhere?</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Changing your password signs you out on every other browser and device straight away. This device stays signed in with a fresh session.
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-[#15803d]">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-bold text-ink">Forgot your password?</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Sign out and use “Forgot password” on the sign-in page to get a reset code by email.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full" onClick={signOut} loading={signingOut}>
              <LogOut className="size-4" aria-hidden />
              Log out of this device
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
