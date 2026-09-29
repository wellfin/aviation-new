"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Card, ConfirmButton, EmptyState, ErrorPanel, PageHeader, StatusPill, formatDateTime } from "@/components/admin/ui";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { can, useAuth, type UserRole } from "@/lib/auth/auth-context";
import { useApi } from "@/lib/hooks/useApi";
import { ROLE_DESCRIPTION, ROLE_LABEL, ROLES, RoleBadge, type AdminUser } from "./shared";

type Feedback = { status: "success" | "error"; message: string } | null;

export function UserDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useApi<AdminUser>(`/admin/users/${id}`);
  const [override, setOverride] = useState<AdminUser | null>(null);
  const [role, setRole] = useState<UserRole | "">("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const user = override ?? data;
  const isSelf = me?.id === id;
  const canManage = can(me, "users:manage") && !isSelf;

  async function update(body: { role?: UserRole; status?: "active" | "suspended" }, success: string) {
    setFeedback(null);
    try {
      const updated = await apiRequest<AdminUser>("PATCH", `/admin/users/${id}`, body);
      setOverride({ ...updated, activeSessions: 0 });
      setRole("");
      setFeedback({ status: "success", message: success });
    } catch (err) {
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Something went wrong. Please try again." });
    }
  }

  async function remove() {
    setFeedback(null);
    try {
      await apiRequest("DELETE", `/admin/users/${id}`);
      router.push("/admin/users");
    } catch (err) {
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't delete this user." });
    }
  }

  const back = (
    <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
      <ArrowLeft className="size-4" /> All users
    </Link>
  );

  if (error && !user) {
    return (
      <>
        {back}
        {error.status === 404 ? (
          <EmptyState title="User not found" description="This account may have been deleted." />
        ) : (
          <ErrorPanel error={error} onRetry={reload} />
        )}
      </>
    );
  }

  if (loading || !user) {
    return (
      <>
        {back}
        <div className="h-64 animate-pulse rounded-2xl bg-white" role="status" aria-label="Loading user" />
      </>
    );
  }

  const selectedRole = role || user.role;

  return (
    <>
      {back}
      <PageHeader title={`${user.firstName} ${user.lastName}`} description={user.email} actions={<RoleBadge role={user.role} />} />

      {feedback && (
        <div className="mb-4">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}
      {isSelf && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-[#a16207]">
          <ShieldAlert className="size-4 shrink-0" aria-hidden /> This is your own account. Another administrator has to change its role, status or delete it.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card title="Profile">
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <Item label="Status" value={<StatusPill status={user.status} />} />
            <Item label="Email verified" value={user.emailVerified ? "Yes" : "No"} />
            <Item label="Phone" value={user.phone ?? "—"} />
            <Item label="Company" value={user.company ?? "—"} />
            <Item label="Account type" value={user.service ? user.service.replace(/^./, (c) => c.toUpperCase()) : "—"} />
            <Item label="Active sessions" value={String(user.activeSessions ?? 0)} />
            <Item label="Joined" value={formatDateTime(user.createdAt)} />
            <Item label="Last sign-in" value={formatDateTime(user.lastLoginAt)} />
            <Item label="Last updated" value={formatDateTime(user.updatedAt)} />
            <Item label="User ID" value={<code className="font-mono text-xs">{user.id}</code>} />
          </dl>
        </Card>

        {can(me, "users:manage") && (
          <div className="flex flex-col gap-4">
            <Card title="Role">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (selectedRole === user.role) return;
                  setSaving(true);
                  await update({ role: selectedRole }, `Role changed to ${ROLE_LABEL[selectedRole]}. Their existing sessions were signed out.`);
                  setSaving(false);
                }}
              >
                <fieldset disabled={!canManage || saving} className="flex flex-col gap-2">
                  <legend className="sr-only">Choose a role</legend>
                  {ROLES.map((r) => (
                    <label key={r} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 text-sm has-checked:border-brand has-checked:bg-brand/5">
                      <input type="radio" name="role" value={r} checked={selectedRole === r} onChange={() => setRole(r)} className="mt-0.5 accent-brand" />
                      <span>
                        <span className="block font-semibold text-ink">{ROLE_LABEL[r]}</span>
                        <span className="block text-xs text-muted">{ROLE_DESCRIPTION[r]}</span>
                      </span>
                    </label>
                  ))}
                  <button
                    type="submit"
                    disabled={selectedRole === user.role}
                    className="mt-1 h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save role"}
                  </button>
                </fieldset>
              </form>
            </Card>

            <Card title="Access">
              <p className="mb-3 text-sm text-muted">
                {user.status === "active"
                  ? "Suspending signs the user out everywhere and blocks sign-in until reactivated."
                  : "This account is suspended and can't sign in."}
              </p>
              <div className="flex flex-wrap gap-2">
                {user.status === "active" ? (
                  <ConfirmButton disabled={!canManage} confirmLabel="Suspend user" onConfirm={() => update({ status: "suspended" }, "User suspended and signed out.")}>
                    Suspend
                  </ConfirmButton>
                ) : (
                  <ConfirmButton disabled={!canManage} tone="primary" confirmLabel="Reactivate" onConfirm={() => update({ status: "active" }, "User reactivated.")}>
                    Reactivate
                  </ConfirmButton>
                )}
                <ConfirmButton disabled={!canManage} confirmLabel="Delete permanently" onConfirm={remove}>
                  Delete user
                </ConfirmButton>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.4px] text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}
