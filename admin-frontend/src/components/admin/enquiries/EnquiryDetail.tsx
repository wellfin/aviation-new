"use client";

import { useState } from "react";
import { Card, EmptyState, ErrorPanel, PageHeader, StatusPill, formatDateTime } from "@/components/admin/ui";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useApi } from "@/lib/hooks/useApi";
import { cn } from "@/lib/utils";
import { BackLink, ContactLink, DetailList } from "./DetailList";
import { ENQUIRY_STATUSES, type AdminEnquiry, type EnquiryStatus } from "./types";
import { siteUrl } from "@/components/admin/news/site";

const TRIP_LABEL = { "one-way": "One way", "round-trip": "Round trip", "multi-leg": "Multi-leg" } as const;

/** `2026-10-01T09:30` (no zone, as entered) → readable text; anything else is shown as-is. */
function formatDepart(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!m) return value || "—";
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const day = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  return m[4] ? `${day}, ${m[4]}:${m[5]}` : day;
}

export function EnquiryDetail({ id }: { id: string }) {
  const { data, error, loading, reload } = useApi<AdminEnquiry>(`/admin/enquiries/${encodeURIComponent(id)}`);
  const [updated, setUpdated] = useState<AdminEnquiry | null>(null);
  const [saving, setSaving] = useState<EnquiryStatus | null>(null);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const enquiry = updated ?? data;

  async function changeStatus(status: EnquiryStatus) {
    setSaving(status);
    setFeedback(null);
    try {
      const next = await apiRequest<AdminEnquiry>("PATCH", `/admin/enquiries/${encodeURIComponent(id)}`, { status });
      setUpdated(next);
      setFeedback({ status: "success", message: `Marked as ${status}.` });
    } catch (err) {
      setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't update the status." });
    } finally {
      setSaving(null);
    }
  }

  const back = <BackLink href="/admin/enquiries">All enquiries</BackLink>;

  if (error && !enquiry) {
    const missing = error.status === 404 || error.status === 422;
    return (
      <>
        {back}
        {missing ? <Card><EmptyState title="Enquiry not found" description="It may have been deleted, or the link is wrong." /></Card> : <ErrorPanel error={error} onRetry={reload} />}
      </>
    );
  }

  if (loading || !enquiry) {
    return (
      <>
        {back}
        <div className="h-64 animate-pulse rounded-2xl bg-white shadow-soft" role="status" aria-label="Loading enquiry" />
      </>
    );
  }

  const trip = enquiry.trip;

  return (
    <>
      {back}
      <PageHeader
        title={`Enquiry from ${enquiry.name}`}
        description={`Received ${formatDateTime(enquiry.createdAt)} · last updated ${formatDateTime(enquiry.updatedAt)}`}
        actions={<StatusPill status={enquiry.status} />}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <Card title="Enquirer">
            <DetailList
              items={[
                { label: "Name", value: enquiry.name },
                { label: "Email", value: <ContactLink kind="email" value={enquiry.email} /> },
                { label: "Phone", value: <ContactLink kind="phone" value={enquiry.phone} /> },
                { label: "Company", value: enquiry.company },
                { label: "Signed-in user", value: enquiry.userId ? <span className="font-mono text-xs">{enquiry.userId}</span> : "Guest" },
              ]}
            />
          </Card>
          <Card title={enquiry.type === "fleet" ? "Fleet charter request" : "General enquiry"}>
            <DetailList
              items={[
                { label: "Service", value: enquiry.service },
                ...(trip
                  ? [
                      { label: "Trip type", value: TRIP_LABEL[trip.tripType] },
                      { label: "Passengers", value: String(trip.passengers) },
                      { label: "From", value: trip.from },
                      { label: "To", value: trip.to },
                      { label: "Departure", value: formatDepart(trip.departAt) },
                      { label: "Aircraft", value: trip.aircraft },
                    ]
                  : []),
                { label: "Message", value: enquiry.message, wide: true },
              ]}
            />
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Provider">
            <p className="font-semibold text-ink">{enquiry.provider.name || "Deleted listing"}</p>
            {enquiry.provider.slug && (
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <a href={siteUrl(`/providers/${enquiry.provider.slug}`)} target="_blank" rel="noopener" className="font-semibold text-brand hover:underline">
                  View listing
                </a>
                <a href={`/admin/enquiries?provider=${encodeURIComponent(enquiry.provider.slug)}`} className="font-semibold text-brand hover:underline">
                  All enquiries for this provider
                </a>
              </div>
            )}
          </Card>
          <Card title="Status">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Set status">
              {ENQUIRY_STATUSES.map((s) => {
                const current = enquiry.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={current}
                    disabled={saving !== null || current}
                    onClick={() => changeStatus(s)}
                    className={cn(
                      "h-9 rounded-xl border px-3 text-sm font-semibold capitalize transition disabled:cursor-default",
                      current ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:bg-surface disabled:opacity-50",
                    )}
                  >
                    {saving === s ? "Saving…" : s}
                  </button>
                );
              })}
            </div>
            {feedback && (
              <div className="mt-3" aria-live="polite">
                <FormStatus status={feedback.status} message={feedback.message} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
