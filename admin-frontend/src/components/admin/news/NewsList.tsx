"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Star } from "lucide-react";
import { ActionIcon, DataTable, EmptyState, ErrorPanel, FilterBar, formatDateTime, Pager, RowActions, SearchFilter, SelectFilter, StatusPill, type Column, Modal, useAddModal } from "@/components/admin/ui";
import type { Paginated } from "@/components/admin/enquiries/types";
import { ButtonLink } from "@/components/ui/Button";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import type { AdminNews } from "./schema";
import { siteUrl } from "./site";


import { NewsEditor } from "./NewsEditor";
export function NewsList() {
  const router = useRouter();
  const { get, page, pageSize } = useUrlParams();
  const addModal = useAddModal();
  const status = ["draft", "published"].includes(get("status")) ? get("status") : "";
  const { data: categories } = useApi<string[]>("/news/categories");
  const category = get("category").trim();
  const q = get("q").trim();
  const { data, error, loading, reload } = useApi<Paginated<AdminNews>>(withQuery("/admin/news", { page, pageSize, status, category, q }));
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
      key: "actions",
      header: "",
      className: "w-px",
      render: (n) => (
        <RowActions>
          <ActionIcon icon={Pencil} label={`Edit ${n.title}`} hint="Edit article: text, image, category and publishing" href={`/admin/news/${n.id}`} />
          <ActionIcon
            icon={ExternalLink}
            label={`View ${n.title} on the site`}
            hint={n.status === "published" ? "View the article on the site (new tab)" : "Not on the site until it's published"}
            href={siteUrl(`/news/${n.slug}`)}
            external
            disabled={n.status !== "published"}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <>
      <FilterBar>
        <SearchFilter placeholder="Title, excerpt, slug or author" label="Search articles" />
        <SelectFilter param="status" label="Status" options={[{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }]} />
        <SelectFilter param="category" label="Category" options={(categories ?? []).map((c) => ({ value: c, label: c }))} />
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
                <EmptyState title="No articles yet" description="Write the first news story for the site." action={<ButtonLink href="/admin/news?new=1" size="sm" className="mt-2">New article</ButtonLink>} />
              )
            }
          />
          {data && data.total > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} />}
        </>
      )}
      <Modal open={addModal.open} onClose={addModal.hide} size="xl" title="New article" description="Drafts stay private until you publish them.">
        <NewsEditor />
      </Modal>
    </>
  );
}
