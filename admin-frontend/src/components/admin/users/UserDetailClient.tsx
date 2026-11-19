"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Card, ConfirmButton, EmptyState, ErrorPanel, PageHeader, StatusPill, formatDateTime } from "@/components/admin/ui";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { can, useAuth } from "@/lib/auth/auth-context";
import { useApi } from "@/lib/hooks/useApi";
import { RolePicker } from "./RolePicker";
import { choiceOf, requestFor, type RoleChoice } from "./roles";
import { RoleBadge, type AdminUser } from "./shared";

type Feedback = { status: "success" | "error"; message: string } | null;

export function UserDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useApi<AdminUser>(`/admin/users/${id}`);
  const [override, setOverride] = useState<AdminUser | null>(null);
  const [role, setRole] = useState<RoleChoice | "">("");
  const [saving, setSaving] = useState(false);
  const params = useSearchParams();
  const [feedback, setFeedback] = useState<Feedback>(params.get("created") ? { status: "success", message: "User added. They can sign in with the email and password you set." } : null);

  const user = override ?? data;
  const isSelf = me?.id === id;
  const target = override ?? data;
  // Only the Super Admin can change or remove Admins; nobody can change the Super Admin.
  const canManage = can(me, "users:manage") && !isSelf && !target?.superAdmin && (target?.role !== "ADMIN" || Boolean(me?.superAdmin));

  async function update(body: { role?: string; staffRole?: string | null; status?: "active" | "suspended" }, success: string) {
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

  const [savingLeadEmails, setSavingLeadEmails] = useState(false);
  async function setLeadEmails(enabled: boolean) {
    setFeedback(null);
    setSavingLeadEmails(true);
    try {
      const updated = await apiRequest<AdminUser>("PUT", `/admin/users/${id}/lead-emails`, { enabled });
      setOverride({ ...updated, activeSessions: (override ?? data)?.activeSessions });
      setFeedback({ status: "success", message: enabled ? "Lead emails turned on: new enquiries will be emailed to this address." : "Lead emails turned off: no more enquiry emails to this address." });
    } catch (err) {
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Something went wrong. Please try again." });
    }
    setSavingLeadEmails(false);
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
        <div className="h-64 animate-pulse rounded-2xl bg-white/60" role="status" aria-label="Loading user" />
      </>
    );
  }

  const current = choiceOf(user);
  const selectedRole = role || current;

  return (
    <>
      {back}
      <PageHeader title={`${user.firstName} ${user.lastName}`} description={user.email} actions={<RoleBadge role={user.role} staffRole={user.staffRole} superAdmin={user.superAdmin} />} />

      {feedback && (
        <div className="mb-4">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}
      {user.superAdmin && !isSelf && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted">
          <ShieldAlert className="size-4 shrink-0" aria-hidden /> This is the Super Admin. Its role and status can&apos;t be changed and it can&apos;t be deleted.
        </p>
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
          {(user.role === "ADMIN" || user.role === "MANAGER") && (
            <label className="mt-5 flex cursor-pointer items-center gap-4 rounded-xl border border-line bg-white/70 p-4 text-sm has-checked:border-brand/40 has-disabled:cursor-not-allowed has-disabled:opacity-60">
              <input
                type="checkbox"
                role="switch"
                checked={user.leadEmails}
                disabled={savingLeadEmails || !(isSelf || (can(me, "users:manage") && !user.superAdmin))}
                onChange={(e) => setLeadEmails(e.target.checked)}
                className="switch"
              />
              <span>
                <span className="block font-semibold text-ink">Lead emails</span>
                <span className="block text-xs text-muted">
                  Email {user.email} every new lead from the website (contact, demo, data licence and advertising forms). Untick to stop them; leads still appear under Leads.
                  {user.superAdmin && !isSelf && " Only the Super Admin can change this."}
                </span>
              </span>
            </label>
          )}
        </Card>

        {can(me, "users:manage") && (
          <div className="flex flex-col gap-4">
            <Card title="Role">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (selectedRole === current) return;
                  setSaving(true);
                  const body = requestFor(selectedRole);
                  await update(body, body.role === user.role ? "Role changed. The new permissions apply straight away." : "Role changed. Their existing sessions were signed out.");
                  setSaving(false);
                }}
              >
                <div className="flex flex-col gap-2">
                  <RolePicker value={selectedRole} onChange={setRole} current={current} disabled={!canManage || saving} />
                  <button
                    type="submit"
                    disabled={!canManage || saving || selectedRole === current}
                    className="mt-1 h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save role"}
                  </button>
                </div>
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
