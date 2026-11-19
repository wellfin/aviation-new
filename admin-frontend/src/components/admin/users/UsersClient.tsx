"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Pencil, UserPlus } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { can, useAuth } from "@/lib/auth/auth-context";
import { ActionIcon, Avatar, ConfirmAction, DataTable, ErrorPanel, FilterBar, formatDateTime, PageHeader, Pager, RowActions, SearchFilter, SelectFilter, StatusPill, StatusTabs, type Column, SortFilter } from "@/components/admin/ui";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import type { Paginated } from "@/lib/types";
import { RoleBadge, SORT_OPTIONS, type AdminUser } from "./shared";

export function UsersClient() {
  const router = useRouter();
  const { user: me } = useAuth();
  const { get, page, pageSize } = useUrlParams();
  const path = withQuery("/admin/users", {
    q: get("q"),
    role: get("role"),
    status: get("status"),
    sort: get("sort"),
    page,
    pageSize,
  });
  const { data, error, loading, reload } = useApi<Paginated<AdminUser>>(path);
  const counts = useApi<{
    all: number;
    ADMIN: number;
    MANAGER: number;
    USER: number;
    PROVIDER: number;
  }>("/admin/users/counts");
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const canManage = can(me, "users:manage");

  async function remove(u: AdminUser) {
    setFeedback(null);
    try {
      await apiRequest("DELETE", `/admin/users/${u.id}`);
      setFeedback({
        status: "success",
        message: `${u.firstName} ${u.lastName} was deleted.`,
      });
      reload();
    } catch (err) {
      setFeedback({
        status: "error",
        message:
          err instanceof ApiError
            ? err.body.message
            : "Couldn't delete this user.",
      });
    }
  }

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "User",
      render: (u) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={`${u.firstName} ${u.lastName}`} />
          <div className="min-w-0">
            <Link
              href={`/admin/users/${u.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-ink hover:text-brand"
            >
              {u.firstName} {u.lastName}
            </Link>
            <p className="flex items-center gap-1 truncate text-xs text-muted">
              {u.email}
              {u.emailVerified && (
                <CheckCircle2
                  className="size-3.5 text-success"
                  aria-label="Email verified"
                />
              )}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      render: (u) => u.company ?? <span className="text-subtle">—</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <RoleBadge
          role={u.role}
          staffRole={u.staffRole}
          superAdmin={u.superAdmin}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => <StatusPill status={u.status} />,
    },
    {
      key: "created",
      header: "Joined",
      render: (u) => (
        <span className="whitespace-nowrap text-muted">
          {formatDateTime(u.createdAt)}
        </span>
      ),
    },
    {
      key: "login",
      header: "Last sign-in",
      render: (u) => (
        <span className="whitespace-nowrap text-muted">
          {formatDateTime(u.lastLoginAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-px",
      render: (u: AdminUser) => (
        <RowActions>
          <ActionIcon icon={Pencil} label={`Open ${u.firstName} ${u.lastName}`} hint="Open profile: change role, status and lead emails" href={`/admin/users/${u.id}`} />
          {canManage && !(u.id === me?.id || u.superAdmin || (u.role === "ADMIN" && !me?.superAdmin)) && (
            <ConfirmAction label={`Delete ${u.firstName} ${u.lastName}`} hint="Delete this account permanently" confirmHint="Yes, delete account and sign it out" onConfirm={() => remove(u)} />
          )}
        </RowActions>
      ),
    },
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
      {feedback && (
        <div className="mb-4">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}
      <FilterBar>
        <StatusTabs
          inline
          param="role"
          label="Role"
          tabs={[
            { value: "", label: "All", count: counts.data?.all },
            { value: "ADMIN", label: "Admins", count: counts.data?.ADMIN },
            { value: "MANAGER", label: "Staff", count: counts.data?.MANAGER },
            { value: "USER", label: "Website users", count: counts.data?.USER },
            {
              value: "PROVIDER",
              label: "Providers",
              count: counts.data?.PROVIDER,
            },
          ]}
        />
        <SearchFilter
          placeholder="Name, email or company"
          label="Search users"
        />
        <SelectFilter
          param="status"
          label="Status"
          options={[
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
          ]}
        />
        <SortFilter defaultValue="newest" options={SORT_OPTIONS} />
        {data && (
          <span className="text-sm text-muted sm:ml-auto">
            {data.total.toLocaleString()} user{data.total === 1 ? "" : "s"}
          </span>
        )}
      </FilterBar>
      {error && !data ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.items}
            rowKey={(u) => u.id}
            loading={loading}
            onRowClick={(u) => router.push(`/admin/users/${u.id}`)}
          />
          {data && data.total > 0 && (
            <Pager
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
            />
          )}
        </>
      )}
    </>
  );
}
