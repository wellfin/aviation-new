"use client";

import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { useState } from "react";
import { ReasonDialog } from "@/components/admin/providers/form-kit";
import { ConfirmButton, EmptyState, ErrorPanel, FilterBar, PageHeader, Pager, SearchFilter, StatusPill, formatDateTime } from "@/components/admin/ui";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useApi, withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import type { Paginated } from "@/lib/types";
import { cn } from "@/lib/utils";
import { siteUrl } from "@/components/admin/news/site";

export interface AdminReview {
  id: string;
  author: string;
  role: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  provider: { id: string; slug: string; name: string };
  moderationNote: string;
  updatedAt: string;
  authorId: string;
  moderatedBy: string | null;
  moderatedAt: string | null;
}

const TABS = [
  { value: "", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-4", i <= rating ? "fill-warning text-warning" : "text-line")} aria-hidden />
      ))}
    </span>
  );
}

export function ReviewsClient() {
  const { get, set, page } = useUrlParams();
  const tab = get("status");
  // The queue defaults to pending; "all" drops the filter.
  const status = tab === "" ? "pending" : tab === "all" ? undefined : tab;
  const path = withQuery("/admin/reviews", { status, provider: get("provider"), q: get("q"), page, pageSize: 20 });
  const { data, error, loading, reload } = useApi<Paginated<AdminReview>>(path);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [rejecting, setRejecting] = useState<AdminReview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fail = (err: unknown) => setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Something went wrong. Please try again." });

  async function approve(r: AdminReview) {
    setBusy(r.id);
    setFeedback(null);
    try {
      await apiRequest("POST", `/admin/reviews/${r.id}/approve`);
      setFeedback({ status: "success", message: `Approved “${r.title}”. It now counts towards ${r.provider.name || "the provider"}'s rating.` });
      reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Reviews" description="Approve or reject reviews before they appear on provider profiles." />

      <nav aria-label="Review status" className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-current={tab === t.value ? "page" : undefined}
            onClick={() => set({ status: t.value })}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap", tab === t.value ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <FilterBar>
        <SearchFilter placeholder="Title, text or author…" label="Search reviews" />
        <SearchFilter param="provider" placeholder="Provider slug or id" label="Filter by provider" />
        {get("provider") && (
          <button type="button" onClick={() => set({ provider: "" })} className="text-sm font-semibold text-brand hover:underline">
            Clear provider
          </button>
        )}
      </FilterBar>

      {feedback && (
        <div className="mb-4">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}

      {error && !data ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : !data ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading reviews">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white shadow-soft">
          {status === "pending" ? (
            <EmptyState title="All caught up" description="There are no reviews waiting for moderation." />
          ) : (
            <EmptyState title="No reviews match" description="Try a different filter." />
          )}
        </div>
      ) : (
        <>
          <ul className={cn("flex flex-col gap-3", loading && "opacity-60")} aria-busy={loading || undefined}>
            {data.items.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars rating={r.rating} />
                      <StatusPill status={r.status} />
                      <span className="text-xs text-muted">{formatDateTime(r.date)}</span>
                    </div>
                    <h2 className="mt-2 font-bold text-ink">{r.title}</h2>
                    <p className="mt-1 text-sm whitespace-pre-line text-ink/80">{r.body}</p>
                    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span>
                        by <span className="font-semibold text-ink">{r.author}</span>
                        {r.role && `, ${r.role}`}
                      </span>
                      {r.provider.slug ? (
                        <span className="inline-flex items-center gap-2">
                          for
                          <Link href={`/admin/providers/${r.provider.id}`} className="font-semibold text-brand hover:underline">
                            {r.provider.name}
                          </Link>
                          <a href={siteUrl(`/providers/${r.provider.slug}`)} target="_blank" rel="noreferrer" aria-label={`Open ${r.provider.name}'s public profile`} className="text-subtle hover:text-brand">
                            <ExternalLink className="size-3.5" />
                          </a>
                          <button type="button" onClick={() => set({ provider: r.provider.slug })} className="font-semibold hover:text-brand">
                            (all reviews)
                          </button>
                        </span>
                      ) : (
                        <span>Provider deleted</span>
                      )}
                    </p>
                    {r.moderatedAt && (
                      <p className="mt-2 text-xs text-muted">
                        Moderated {formatDateTime(r.moderatedAt)}
                        {r.moderationNote && (
                          <>
                            {" "}
                            · Note: <span className="text-ink">{r.moderationNote}</span>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {r.status !== "approved" && (
                      <button
                        type="button"
                        disabled={busy === r.id}
                        onClick={() => approve(r)}
                        className="h-9 rounded-xl bg-success px-3 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50"
                      >
                        {busy === r.id ? "Approving…" : "Approve"}
                      </button>
                    )}
                    {r.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => setRejecting(r)}
                        className="h-9 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-danger hover:bg-danger/5"
                      >
                        Reject…
                      </button>
                    )}
                    <ConfirmButton
                      confirmLabel="Delete review"
                      onConfirm={async () => {
                        setFeedback(null);
                        try {
                          await apiRequest("DELETE", `/admin/reviews/${r.id}`);
                          setFeedback({ status: "success", message: "Review deleted." });
                          reload();
                        } catch (err) {
                          fail(err);
                        }
                      }}
                    >
                      Delete
                    </ConfirmButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pager page={data.page} totalPages={data.totalPages} total={data.total} />
        </>
      )}

      <ReasonDialog
        open={rejecting !== null}
        title="Reject this review?"
        description="Rejected reviews are hidden from the profile. The author sees your note on their account."
        label="Note to the author"
        maxLength={500}
        confirmLabel="Reject review"
        onClose={() => setRejecting(null)}
        onConfirm={async (note) => {
          if (!rejecting) return;
          await apiRequest("POST", `/admin/reviews/${rejecting.id}/reject`, note ? { note } : {});
          setFeedback({ status: "success", message: `Rejected “${rejecting.title}”.` });
          reload();
        }}
      />
    </>
  );
}
