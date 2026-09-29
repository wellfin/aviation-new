"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmButton, EmptyState, ErrorPanel, Pager, PageHeader, StatusPill } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { withQuery } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { cn, formatDate } from "@/lib/utils";
import { useAccountApi } from "./hooks";
import type { OwnReview, Paginated } from "./types";
import { RequirePermission } from "./ui";

const STATUS_HELP: Record<OwnReview["status"], string> = {
  pending: "Awaiting moderation — usually within one business day.",
  approved: "Published on the provider's profile.",
  rejected: "Not published.",
};

export function ReviewsList() {
  return (
    <RequirePermission permission="reviews:create" title="Reviews">
      <Reviews />
    </RequirePermission>
  );
}

function Reviews() {
  const { page } = useUrlParams();
  const { data, error, loading, reload } = useAccountApi<Paginated<OwnReview>>(withQuery("/me/reviews", { page, pageSize: 10 }));
  const [status, setStatus] = useState<{ status: "success" | "error"; message: string } | null>(null);

  async function remove(r: OwnReview) {
    setStatus(null);
    try {
      await apiRequest("DELETE", `/me/reviews/${r.id}`);
      setStatus({ status: "success", message: `Your review of ${r.provider.name || "this provider"} was deleted.` });
      reload();
    } catch (err) {
      setStatus({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't delete the review. Please try again." });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My reviews" description="Reviews you've written. New reviews are checked by our team before they appear publicly." />
      {status && <FormStatus status={status.status} message={status.message} />}
      {error ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white shadow-soft">
          <EmptyState
            title="You haven't written any reviews"
            description="Share your experience with FBOs, handlers and operators to help other crews choose."
            action={
              <ButtonLink href="/directory" size="sm" className="mt-3">
                Find a provider to review
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <>
          <ul className={cn("space-y-4", loading && "opacity-60")}>
            {data.items.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-[0.4px] text-muted uppercase">
                      {r.provider.slug ? (
                        <Link href={`/providers/${r.provider.slug}`} className="text-brand hover:underline">
                          {r.provider.name}
                        </Link>
                      ) : (
                        "Provider no longer listed"
                      )}
                    </p>
                    <h2 className="mt-1 font-bold text-ink">{r.title}</h2>
                  </div>
                  <StatusPill status={r.status} />
                </div>
                <p className="mt-2 flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={cn("size-4", i <= r.rating ? "fill-warning text-warning" : "text-line")} aria-hidden />
                  ))}
                </p>
                <p className="mt-2 text-sm leading-6 whitespace-pre-line text-muted">{r.body}</p>
                {r.status === "rejected" && r.moderationNote && (
                  <p className="mt-3 rounded-xl bg-danger/5 px-3 py-2 text-sm text-danger">
                    <span className="font-semibold">Moderator note:</span> {r.moderationNote}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-xs text-subtle">
                  <span>
                    Written {formatDate(r.date)} · {STATUS_HELP[r.status]}
                  </span>
                  <ConfirmButton confirmLabel="Delete review" onConfirm={() => remove(r)}>
                    Delete
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
          {data.totalPages > 1 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} />}
        </>
      )}
    </div>
  );
}
