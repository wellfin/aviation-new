"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Star } from "lucide-react";
import { DataTable, EmptyState, ErrorPanel, FilterBar, Pager, SearchFilter, SelectFilter, StatusPill, formatDateTime, type Column } from "@/components/admin/ui";
import type { Paginated } from "@/components/admin/enquiries/types";
import { ButtonLink } from "@/components/ui/Button";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { NEWS_CATEGORIES, type AdminNews } from "./schema";
import { siteUrl } from "./site";

const PAGE_SIZE = 20;

export function NewsList() {
  const router = useRouter();
  const { get, page } = useUrlParams();
  const status = ["draft", "published"].includes(get("status")) ? get("status") : "";
  const category = (NEWS_CATEGORIES as readonly string[]).includes(get("category")) ? get("category") : "";
  const q = get("q").trim();
  const { data, error, loading, reload } = useApi<Paginated<AdminNews>>(withQuery("/admin/news", { page, pageSize: PAGE_SIZE, status, category, q }));
  const filtered = Boolean(status || category || q);

  const columns: Column<AdminNews>[] = [
    {
      key: "title",
      header: "Article",
      render: (n) => (
        <Link href={`/admin/news/${n.id}`} onClick={(e) => e.stopPropagation()} className="block max-w-md font-semibold text-ink hover:text-brand">
          <span className="flex items-center gap-1.5">
            {n.featured && <Star className="size-3.5 shrink-0 fill-warning text-warning" aria-label="Featured" />}
            <span className="line-clamp-2">{n.title}</span>
          </span>
          <span className="block truncate font-mono text-xs font-normal text-muted">/{n.slug}</span>
        </Link>
      ),
    },
    { key: "category", header: "Category", render: (n) => <span className="whitespace-nowrap">{n.category}</span> },
    { key: "status", header: "Status", render: (n) => <StatusPill status={n.status} /> },
    { key: "author", header: "Author", render: (n) => <span className="whitespace-nowrap">{n.author}</span> },
    { key: "published", header: "Published", render: (n) => <span className="whitespace-nowrap text-muted">{formatDateTime(n.publishedAt)}</span> },
    { key: "updated", header: "Updated", render: (n) => <span className="whitespace-nowrap text-muted">{formatDateTime(n.updatedAt)}</span> },
    {
      key: "view",
      header: "",
      render: (n) =>
        n.status === "published" ? (
          <a href={siteUrl(`/news/${n.slug}`)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="relative inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-brand hover:underline">
            View <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">{n.title} on the site</span>
          </a>
        ) : null,
    },
  ];

  return (
    <>
      <FilterBar>
        <SearchFilter placeholder="Title, excerpt, slug or author" label="Search articles" />
        <SelectFilter param="status" label="Status" options={[{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }]} />
        <SelectFilter param="category" label="Category" options={NEWS_CATEGORIES.map((c) => ({ value: c, label: c }))} />
      </FilterBar>
      {error ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.items}
            rowKey={(n) => n.id}
            loading={loading}
            onRowClick={(n) => router.push(`/admin/news/${n.id}`)}
            empty={
              filtered ? (
                <EmptyState title="No articles match" description="Try changing the filters." />
              ) : (
                <EmptyState title="No articles yet" description="Write the first news story for the site." action={<ButtonLink href="/admin/news/new" size="sm" className="mt-2">New article</ButtonLink>} />
              )
            }
          />
          {data && data.total > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} />}
        </>
      )}
    </>
  );
}
