"use client";

import Link from "next/link";
import { useApi } from "@/lib/hooks/useApi";
import type { UserRole } from "@/lib/auth/auth-context";
import { PERMISSION_LABEL, type RoleChoice, type StaffRole } from "./roles";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "./shared";

/**
 * Radio list of staff roles: Admin, Manager and each custom role.
 * User and Provider aren't offered (those accounts sign up on the website); `current` keeps
 * one visible when the person already has it, so their present role still shows.
 */
export function RolePicker({ value, onChange, disabled, current, name = "role" }: { value: RoleChoice; onChange: (v: RoleChoice) => void; disabled?: boolean; current?: RoleChoice; name?: string }) {
  const { data: custom, loading } = useApi<StaffRole[]>("/admin/roles");
  const siteRole = current === "USER" || current === "PROVIDER" ? (current as UserRole) : null;

  const option = (choice: RoleChoice, label: string, description: string) => (
    <label key={choice} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 text-sm has-checked:border-brand has-checked:bg-brand/5 has-disabled:cursor-not-allowed">
      <input type="radio" name={name} value={choice} checked={value === choice} onChange={() => onChange(choice)} disabled={disabled} className="mt-0.5 accent-brand" />
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{label}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
    </label>
  );

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="sr-only">Choose a role</legend>
      {siteRole && option(siteRole, `${ROLE_LABEL[siteRole]} (current)`, ROLE_DESCRIPTION[siteRole])}
      {option("ADMIN", ROLE_LABEL.ADMIN, ROLE_DESCRIPTION.ADMIN)}
      {option("MANAGER", "Manager (standard)", ROLE_DESCRIPTION.MANAGER)}
      {loading && !custom && <div className="h-14 animate-pulse rounded-xl bg-surface" role="status" aria-label="Loading roles" />}
      {(custom ?? []).map((r) =>
        option(
          `custom:${r.id}`,
          r.name,
          r.description || r.permissions.map((p) => PERMISSION_LABEL[p] ?? p).join(", "),
        ),
      )}
      {custom && custom.length === 0 && (
        <p className="px-1 text-xs text-subtle">
          Need a role with only some permissions?{" "}
          <Link href="/admin/roles/new" className="font-semibold text-brand hover:underline">
            Create one
          </Link>
          .
        </p>
      )}
    </fieldset>
  );
}
