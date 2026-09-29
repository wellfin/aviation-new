"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Plus, Star } from "lucide-react";
import { useState } from "react";
import { Card, DataTable, EmptyState, ErrorPanel, FilterBar, PageHeader, Pager, SearchFilter, SelectFilter, StatusPill, formatDateTime, type Column } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { FormStatus } from "@/components/ui/Field";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import type { Paginated } from "@/lib/types";
import { cn } from "@/lib/utils";
import { siteUrl } from "@/components/admin/news/site";
import { useCategories } from "@/components/admin/services/categories";
import { PROVIDER_STATUSES, PROVIDER_TIERS, TIER_LABEL, type AdminProvider } from "./schema";
import { StatusActions } from "./StatusActions";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name A–Z" },
  { value: "rating", label: "Top rated" },
];

export function TierPill({ tier }: { tier: AdminProvider["tier"] }) {
  const tone = tier === "ultra_pro" ? "amber" : tier === "pro" ? "blue" : "slate";
  return <StatusPill status={TIER_LABEL[tier]} tone={tone} />;
}

export function ProvidersClient() {
  const router = useRouter();
  const { get, set, page } = useUrlParams();
  const status = get("status");
  const path = withQuery("/admin/providers", { q: get("q"), status, category: get("category"), tier: get("tier"), sort: get("sort"), page, pageSize: 20 });
  const list = useApi<Paginated<AdminProvider>>(path);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const { categories, names } = useCategories();

  const columns: Column<AdminProvider>[] = [
    {
      key: "name",
      header: "Listing",
      render: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface text-sm font-bold text-muted" aria-hidden>
            {p.logo ? <Image src={siteUrl(p.logo)} alt="" fill unoptimized sizes="40px" className="object-contain p-1" /> : p.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <Link href={`/admin/providers/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:text-brand">
              {p.name}
            </Link>
            <p className="truncate text-xs text-muted">
              {p.city}, {p.country}
              {p.airports.length > 0 && ` · ${p.airports.map((a) => a.icao).slice(0, 3).join(", ")}${p.airports.length > 3 ? "…" : ""}`}
            </p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (p) => <span className="whitespace-nowrap">{names[p.category] ?? p.category}</span> },
    {
      key: "tier",
      header: "Tier",
      render: (p) => (
        <span className="flex items-center gap-1 whitespace-nowrap">
          <TierPill tier={p.tier} />
          {p.verified && <StatusPill status="verified" tone="green" />}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (p) => <StatusPill status={p.status} /> },
    {
      key: "rating",
      header: "Rating",
      render: (p) => (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Star className="size-3.5 fill-warning text-warning" aria-hidden /> {p.rating.toFixed(1)} <span className="text-muted">({p.reviewCount})</span>
        </span>
      ),
    },
    { key: "owner", header: "Owner", render: (p) => (p.owner ? <span className="text-xs">{p.owner.email}</span> : <span className="text-xs whitespace-nowrap text-subtle">Staff-managed</span>) },
    { key: "updated", header: "Updated", render: (p) => <span className="whitespace-nowrap text-muted">{formatDateTime(p.updatedAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Providers"
        description="Review new listings, curate the directory and manage tiers."
        actions={
          <Link href="/admin/providers/new" className={buttonClasses("primary", "md")}>
            <Plus className="size-4" /> New listing
          </Link>
        }
      />

      {feedback && (
        <div className="mb-4">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}

      {status !== "pending" && (
        <PendingQueue
          names={names}
          onChanged={(message) => {
            setFeedback({ status: "success", message });
            list.reload();
          }}
          onError={(message) => setFeedback({ status: "error", message })}
          onViewAll={() => set({ status: "pending", sort: "oldest" })}
        />
      )}

      <nav aria-label="Listing status" className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {[{ value: "", label: "All" }, ...PROVIDER_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))].map((t) => (
          <button
            key={t.value}
            type="button"
            aria-current={status === t.value ? "page" : undefined}
            onClick={() => set({ status: t.value })}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap",
              status === t.value ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <FilterBar>
        <SearchFilter placeholder="Name, city, email or ICAO…" label="Search listings" />
        <SelectFilter param="category" label="Category" options={categories.map((c) => ({ value: c.slug, label: c.active ? c.name : `${c.name} (inactive)` }))} />
        <SelectFilter param="tier" label="Tier" options={PROVIDER_TIERS.map((t) => ({ value: t, label: TIER_LABEL[t] }))} />
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sort</span>
          <select value={get("sort", "newest")} onChange={(e) => set({ sort: e.target.value === "newest" ? "" : e.target.value })} className="h-10 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand">
            {SORTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>

      {list.error && !list.data ? (
        <ErrorPanel error={list.error} onRetry={list.reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={list.data?.items}
            rowKey={(p) => p.id}
            loading={list.loading}
            onRowClick={(p) => router.push(`/admin/providers/${p.id}`)}
            empty={
              status === "pending" ? (
                <EmptyState title="The moderation queue is empty" description="No listings are waiting for review." />
              ) : (
                <EmptyState title="No listings match" description="Try a different search or filter." />
              )
            }
          />
          {list.data && list.data.total > 0 && <Pager page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} />}
        </>
      )}
    </>
  );
}

function PendingQueue({ names, onChanged, onError, onViewAll }: { names: Record<string, string>; onChanged: (message: string) => void; onError: (message: string) => void; onViewAll: () => void }) {
  const queue = useApi<Paginated<AdminProvider>>("/admin/providers?status=pending&sort=oldest&pageSize=5");
  if (queue.error || !queue.data || queue.data.total === 0) return null;
  return (
    <Card
      className="mb-6 border-warning/50"
      title={`Moderation queue · ${queue.data.total} awaiting review`}
      actions={
        <button type="button" onClick={onViewAll} className="text-sm font-semibold text-brand hover:underline">
          View all
        </button>
      }
    >
      <ul className="divide-y divide-line">
        {queue.data.items.map((p) => (
          <li key={p.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <Link href={`/admin/providers/${p.id}`} className="font-semibold text-ink hover:text-brand">
                {p.name}
              </Link>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                <span>{names[p.category] ?? p.category}</span>
                <span>
                  {p.city}, {p.country}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" aria-hidden /> submitted {formatDateTime(p.updatedAt)}
                </span>
                {p.owner && <span>by {p.owner.email}</span>}
              </p>
            </div>
            <StatusActions
              compact
              provider={p}
              actions={["approve", "reject"]}
              onChanged={(_updated, message) => {
                queue.reload();
                onChanged(message);
              }}
              onError={onError}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
