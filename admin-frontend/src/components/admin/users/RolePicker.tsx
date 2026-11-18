"use client";

import Link from "next/link";
import { useApi } from "@/lib/hooks/useApi";
import { useAuth, type UserRole } from "@/lib/auth/auth-context";
import { PERMISSION_LABEL, type RoleChoice, type StaffRole } from "./roles";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "./shared";

/**
 * Radio list of staff roles: Admin (Super Admin only) and each custom role.
 * User, Provider and the plain Manager role aren't offered; `current` keeps one visible
 * when the person already has it, so their present role still shows.
 */
export function RolePicker({ value, onChange, disabled, current, name = "role" }: { value: RoleChoice; onChange: (v: RoleChoice) => void; disabled?: boolean; current?: RoleChoice; name?: string }) {
  const { data: custom, loading } = useApi<StaffRole[]>("/admin/roles");
  const { user: me } = useAuth();
  const legacy = current === "USER" || current === "PROVIDER" || current === "MANAGER" ? (current as UserRole) : null;
  const showAdmin = Boolean(me?.superAdmin) || current === "ADMIN";

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
      {legacy && option(legacy, `${legacy === "MANAGER" ? "Manager (standard)" : ROLE_LABEL[legacy]} (current)`, ROLE_DESCRIPTION[legacy])}
      {showAdmin && option("ADMIN", ROLE_LABEL.ADMIN, ROLE_DESCRIPTION.ADMIN)}
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
          No staff roles yet.{" "}
          <Link href="/admin/roles/new" className="font-semibold text-brand hover:underline">
            Create one
          </Link>{" "}
          (for example &ldquo;Accountant&rdquo;) under Roles & permissions.
        </p>
      )}
    </fieldset>
  );
}
