"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, UserPlus } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { can, useAuth } from "@/lib/auth/auth-context";
import { ConfirmButton, DataTable, ErrorPanel, FilterBar, PageHeader, Pager, SearchFilter, SelectFilter, StatusPill, formatDateTime, type Column } from "@/components/admin/ui";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import type { Paginated } from "@/lib/types";
import { ROLE_OPTIONS, RoleBadge, SORT_OPTIONS, type AdminUser } from "./shared";

export function UsersClient() {
  const router = useRouter();
  const { user: me } = useAuth();
  const { get, set, page } = useUrlParams();
  const path = withQuery("/admin/users", { q: get("q"), role: get("role"), status: get("status"), sort: get("sort"), page, pageSize: 20 });
  const { data, error, loading, reload } = useApi<Paginated<AdminUser>>(path);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const canManage = can(me, "users:manage");

  async function remove(u: AdminUser) {
    setFeedback(null);
    try {
      await apiRequest("DELETE", `/admin/users/${u.id}`);
      setFeedback({ status: "success", message: `${u.firstName} ${u.lastName} was deleted.` });
      reload();
    } catch (err) {
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't delete this user." });
    }
  }

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "User",
      render: (u) => (
        <div className="min-w-0">
          <Link href={`/admin/users/${u.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:text-brand">
            {u.firstName} {u.lastName}
          </Link>
          <p className="flex items-center gap-1 truncate text-xs text-muted">
            {u.email}
            {u.emailVerified && <CheckCircle2 className="size-3.5 text-success" aria-label="Email verified" />}
          </p>
        </div>
      ),
    },
    { key: "company", header: "Company", render: (u) => u.company ?? <span className="text-subtle">—</span> },
    { key: "role", header: "Role", render: (u) => <RoleBadge role={u.role} staffRole={u.staffRole} superAdmin={u.superAdmin} /> },
    { key: "status", header: "Status", render: (u) => <StatusPill status={u.status} /> },
    { key: "created", header: "Joined", render: (u) => <span className="whitespace-nowrap text-muted">{formatDateTime(u.createdAt)}</span> },
    { key: "login", header: "Last sign-in", render: (u) => <span className="whitespace-nowrap text-muted">{formatDateTime(u.lastLoginAt)}</span> },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            render: (u: AdminUser) =>
              u.id === me?.id || u.superAdmin ? null : (
                // Keep the click from opening the row.
                <span onClick={(e) => e.stopPropagation()} className="inline-flex">
                  <ConfirmButton confirmLabel="Delete" onConfirm={() => remove(u)}>
                    Delete
                  </ConfirmButton>
                </span>
              ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Users"
        description="Search accounts, add people, change roles and suspend or remove access."
        actions={
          canManage && (
            <ButtonLink href="/admin/users/new" size="sm">
              <UserPlus className="size-4" aria-hidden /> Add user
            </ButtonLink>
          )
        }
      />
      <FilterBar>
        <SearchFilter placeholder="Name, email or company…" label="Search users" />
        <SelectFilter param="role" label="Role" options={ROLE_OPTIONS} />
        <SelectFilter param="status" label="Status" options={[{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }]} />
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sort</span>
          <select value={get("sort", "newest")} onChange={(e) => set({ sort: e.target.value === "newest" ? "" : e.target.value })} className="h-10 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>
      {feedback && (
        <div className="mb-4">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}
      {error && !data ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : (
        <>
          <DataTable columns={columns} rows={data?.items} rowKey={(u) => u.id} loading={loading} onRowClick={(u) => router.push(`/admin/users/${u.id}`)} />
          {data && data.total > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} />}
        </>
      )}
    </>
  );
}
