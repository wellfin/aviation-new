"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { DataTable, ErrorPanel, FilterBar, PageHeader, Pager, SearchFilter, SelectFilter, StatusPill, formatDateTime, type Column } from "@/components/admin/ui";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import type { Paginated } from "@/lib/types";
import { ROLE_OPTIONS, RoleBadge, SORT_OPTIONS, type AdminUser } from "./shared";

export function UsersClient() {
  const router = useRouter();
  const { get, set, page } = useUrlParams();
  const path = withQuery("/admin/users", { q: get("q"), role: get("role"), status: get("status"), sort: get("sort"), page, pageSize: 20 });
  const { data, error, loading, reload } = useApi<Paginated<AdminUser>>(path);

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
    { key: "role", header: "Role", render: (u) => <RoleBadge role={u.role} /> },
    { key: "status", header: "Status", render: (u) => <StatusPill status={u.status} /> },
    { key: "created", header: "Joined", render: (u) => <span className="whitespace-nowrap text-muted">{formatDateTime(u.createdAt)}</span> },
    { key: "login", header: "Last sign-in", render: (u) => <span className="whitespace-nowrap text-muted">{formatDateTime(u.lastLoginAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Users" description="Search accounts, change roles and suspend or remove access." />
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
