"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { Building2, Mail, Phone, UserRound } from "lucide-react";
import { Card, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input } from "@/components/ui/Field";
import { apiRequest } from "@/lib/api/client";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { useAccount } from "./AccountShell";
import { ACCOUNT_API } from "./hooks";
import { profileSchema } from "./schema";
import type { AccountProfile } from "./types";

export function ProfileForm() {
  const { user, profile } = useAccount();
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="How you appear to providers when you send enquiries or write reviews." />
      {ACCOUNT_API && !profile ? (
        <div className="h-96 animate-pulse rounded-2xl bg-surface" aria-busy="true">
          <span className="sr-only">Loading profile…</span>
        </div>
      ) : (
        // Re-mount when the stored profile changes so defaults reflect the saved values.
        <ProfileFields key={profile?.createdAt ?? user.id} />
      )}
    </div>
  );
}

function ProfileFields() {
  const { user, profile, setProfile } = useAccount();
  const { refreshUser } = useAuth();
  const { errors, submitting, result, handleSubmit } = useZodForm(
    profileSchema,
    async (data) => {
      const updated = await apiRequest<AccountProfile>("PATCH", "/auth/me", data);
      if (ACCOUNT_API && updated?.id) {
        setProfile(updated);
        // Keep the header and other session consumers in sync.
        await refreshUser();
      }
      return "Your profile has been updated.";
    },
    { resetOnSuccess: false },
  );

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
        <Input name="firstName" label="First name" autoComplete="given-name" defaultValue={profile?.firstName ?? user.firstName} error={errors.firstName} icon={<UserRound className="size-4" aria-hidden />} required maxLength={100} />
        <Input name="lastName" label="Last name" autoComplete="family-name" defaultValue={profile?.lastName ?? user.lastName} error={errors.lastName} icon={<UserRound className="size-4" aria-hidden />} required maxLength={100} />
        <Input
          name="email"
          label="Email"
          value={user.email}
          readOnly
          disabled
          icon={<Mail className="size-4" aria-hidden />}
          hint="Your sign-in email can't be changed here. Contact support if you need to move your account."
          wrapperClassName="sm:col-span-2"
        />
        <Input name="phone" label="Phone" type="tel" autoComplete="tel" placeholder="+44 20 7946 0000" defaultValue={profile?.phone ?? ""} error={errors.phone} icon={<Phone className="size-4" aria-hidden />} maxLength={30} />
        <Input name="company" label="Company" autoComplete="organization" placeholder="Optional" defaultValue={profile?.company ?? ""} error={errors.company} icon={<Building2 className="size-4" aria-hidden />} maxLength={120} />
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[1px] flex-1">{result.status !== "idle" && <FormStatus status={result.status} message={result.message} />}</div>
          <Button type="submit" loading={submitting}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}
