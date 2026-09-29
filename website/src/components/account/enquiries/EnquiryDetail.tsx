"use client";

import { ArrowLeft, Building2, Mail, Phone, Plane, Reply } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Card, ErrorPanel, formatDateTime, StatusPill } from "@/components/admin/ui";
import { FormStatus } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useAccountApi } from "../hooks";
import { OWNER_SETTABLE_STATUSES, type Enquiry, type EnquiryStatus } from "../types";
import { RequirePermission } from "../ui";

const ACTION_LABEL: Record<(typeof OWNER_SETTABLE_STATUSES)[number], string> = {
  read: "Mark as read",
  replied: "Mark as replied",
  closed: "Close",
  spam: "Mark as spam",
};

const TRIP_LABEL: Record<string, string> = { "one-way": "One way", "round-trip": "Round trip", "multi-leg": "Multi-leg" };

export function EnquiryDetail({ id }: { id: string }) {
  return (
    <RequirePermission permission="enquiries:read:own" title="Enquiries">
      <Detail id={id} />
    </RequirePermission>
  );
}

function mailtoFor(e: Enquiry): string {
  const subject = `Re: ${e.trip ? `Charter enquiry ${e.trip.from} → ${e.trip.to}` : e.service || "Your enquiry"} — ${e.provider.name}`;
  const quoted = e.message ? `\n\n---\nOn ${formatDateTime(e.createdAt)}, ${e.name} wrote:\n${e.message.split("\n").map((l) => `> ${l}`).join("\n")}` : "";
  const body = `Hello ${e.name.split(" ")[0]},\n\nThank you for contacting ${e.provider.name}.${quoted}`;
  return `mailto:${e.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-xs font-semibold tracking-[0.4px] text-muted uppercase">{label}</dt>
      <dd className="text-sm break-words text-ink">{children}</dd>
    </div>
  );
}

function Detail({ id }: { id: string }) {
  // Opening the enquiry marks it read on the server.
  const { data, error, loading, reload } = useAccountApi<Enquiry>(`/me/enquiries/${id}`);
  const [override, setOverride] = useState<Enquiry | null>(null);
  const [busy, setBusy] = useState<EnquiryStatus | null>(null);
  const [status, setStatus] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const enquiry = override?.id === id ? override : data;

  async function update(next: (typeof OWNER_SETTABLE_STATUSES)[number]) {
    setBusy(next);
    setStatus(null);
    try {
      const updated = await apiRequest<Enquiry>("PATCH", `/me/enquiries/${id}`, { status: next });
      setOverride(updated);
      setStatus({ status: "success", message: `Enquiry marked as ${next}.` });
    } catch (err) {
      setStatus({ status: "error", message: err instanceof ApiError ? err.body.message : "Couldn't update the enquiry." });
    } finally {
      setBusy(null);
    }
  }

  const back = (
    <Link href="/account/enquiries" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
      <ArrowLeft className="size-4" aria-hidden /> All enquiries
    </Link>
  );

  if (error) {
    const missing = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <div className="space-y-4">
        {back}
        {missing ? (
          <Card>
            <p className="font-semibold text-ink">Enquiry not found</p>
            <p className="mt-1 text-sm text-muted">It may have been removed, or it belongs to a listing you don&apos;t manage.</p>
          </Card>
        ) : (
          <ErrorPanel error={error} onRetry={reload} />
        )}
      </div>
    );
  }

  if (loading || !enquiry) {
    return (
      <div className="space-y-4" aria-busy="true">
        {back}
        <div className="h-96 animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  const e = enquiry;
  return (
    <div className="space-y-5">
      {back}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-ink">{e.trip ? `${e.trip.from} → ${e.trip.to}` : e.service || "General enquiry"}</h1>
          <p className="mt-1 text-sm text-muted">
            From <span className="font-semibold text-ink">{e.name}</span> · {formatDateTime(e.createdAt)} · for {e.provider.name}
          </p>
        </div>
        <StatusPill status={e.status} />
      </div>

      {status && <FormStatus status={status.status} message={status.message} />}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          {e.trip && (
            <Card title="Trip details">
              <dl className="divide-y divide-line">
                <Row label="Trip">{TRIP_LABEL[e.trip.tripType] ?? e.trip.tripType}</Row>
                <Row label="Route">
                  {e.trip.from} → {e.trip.to}
                </Row>
                <Row label="Departure">{e.trip.departAt.replace("T", " at ")}</Row>
                <Row label="Passengers">{e.trip.passengers}</Row>
                {e.trip.aircraft && (
                  <Row label="Aircraft">
                    <span className="inline-flex items-center gap-1.5">
                      <Plane className="size-4 text-brand" aria-hidden /> {e.trip.aircraft}
                    </span>
                  </Row>
                )}
              </dl>
            </Card>
          )}
          <Card title="Message">
            {e.message ? <p className="text-sm leading-7 whitespace-pre-line text-ink">{e.message}</p> : <p className="text-sm text-muted">No message was included.</p>}
            {!e.trip && e.service && <p className="mt-4 text-xs text-muted">Service requested: {e.service}</p>}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Contact">
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-subtle" aria-hidden />
                <a href={`mailto:${e.email}`} className="truncate text-brand hover:underline">
                  {e.email}
                </a>
              </li>
              {e.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0 text-subtle" aria-hidden />
                  <a href={`tel:${e.phone.replace(/[^\d+]/g, "")}`} className="text-brand hover:underline">
                    {e.phone}
                  </a>
                </li>
              )}
              {e.company && (
                <li className="flex items-center gap-2">
                  <Building2 className="size-4 shrink-0 text-subtle" aria-hidden />
                  {e.company}
                </li>
              )}
            </ul>
            <a
              href={mailtoFor(e)}
              className="bg-brand-gradient mt-4 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white hover:brightness-110"
            >
              <Reply className="size-4" aria-hidden /> Reply by email
            </a>
            <p className="mt-2 text-xs text-subtle">Opens your email app. Mark the enquiry as replied once you&apos;ve sent your answer.</p>
          </Card>

          <Card title="Status">
            <div className="flex flex-col gap-2">
              {OWNER_SETTABLE_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy !== null || e.status === s}
                  onClick={() => update(s)}
                  aria-pressed={e.status === s}
                  className={cn(
                    "h-10 rounded-xl border px-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed",
                    e.status === s ? "border-brand bg-brand/8 text-brand" : "border-line bg-white text-ink hover:bg-surface disabled:opacity-50",
                    s === "spam" && e.status !== s && "text-danger",
                  )}
                >
                  {busy === s ? "Saving…" : e.status === s ? `✓ ${s[0]!.toUpperCase()}${s.slice(1)}` : ACTION_LABEL[s]}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
