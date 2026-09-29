"use client";

import { useState, type FormEvent } from "react";
import { Card, EmptyState, ErrorPanel, PageHeader, StatusPill, formatDateTime } from "@/components/admin/ui";
import { BackLink, ContactLink, DetailList, type DetailItem } from "@/components/admin/enquiries/DetailList";
import type { Paginated } from "@/components/admin/enquiries/types";
import { Button } from "@/components/ui/Button";
import { FormStatus, Select, Textarea } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { can, useAuth } from "@/lib/auth/auth-context";
import { useApi } from "@/lib/hooks/useApi";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, LEAD_TYPE_LABEL, noteSchema, type Lead, type LeadStatus, type StaffUser, type UserRef } from "./types";

type Feedback = { status: "success" | "error"; message: string } | null;

const errorMessage = (err: unknown, fallback: string) => (err instanceof ApiError ? err.body.message : fallback);

/** The type-specific answers stored under `details`. */
function detailItems(lead: Lead): DetailItem[] {
  const d = lead.details;
  const text = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  switch (lead.type) {
    case "contact":
      return [{ label: "Subject", value: text("subject") }];
    case "demo":
      return [
        { label: "First name", value: text("firstName") },
        { label: "Last name", value: text("lastName") },
        { label: "Role", value: text("role") },
        { label: "Interested in", value: text("interest") },
        { label: "Preferred date", value: text("preferredDate") },
      ];
    case "data_licence": {
      const sets = Array.isArray(d.datasets) ? d.datasets : [];
      return [
        {
          label: "Datasets",
          wide: true,
          value: sets.length ? (
            <span className="flex flex-wrap gap-1.5">
              {sets.map((s) => (
                <span key={s} className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                  {s}
                </span>
              ))}
            </span>
          ) : (
            ""
          ),
        },
      ];
    }
    case "advertising":
      return [
        { label: "Ad format", value: text("placement") },
        { label: "Budget", value: text("budget") },
      ];
  }
}

/** Active admins + managers who can own a lead. Needs `users:read`; otherwise only the current assignee / yourself are offered. */
function useStaff(enabled: boolean) {
  const admins = useApi<Paginated<StaffUser>>(enabled ? "/admin/users?role=ADMIN&status=active&pageSize=100&sort=name" : null);
  const managers = useApi<Paginated<StaffUser>>(enabled ? "/admin/users?role=MANAGER&status=active&pageSize=100&sort=name" : null);
  const list: UserRef[] = [...(admins.data?.items ?? []), ...(managers.data?.items ?? [])].map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
  }));
  return { list, loading: admins.loading || managers.loading, failed: Boolean(admins.error || managers.error) };
}

export function LeadDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const canManage = can(user, "leads:manage");
  const { data, error, loading, reload } = useApi<Lead>(`/admin/leads/${encodeURIComponent(id)}`);
  const [updated, setUpdated] = useState<Lead | null>(null);
  const lead = updated ?? data;
  const staff = useStaff(canManage && can(user, "users:read"));

  const back = <BackLink href="/admin/leads">All leads</BackLink>;

  if (error && !lead) {
    const missing = error.status === 404 || error.status === 422;
    return (
      <>
        {back}
        {missing ? (
          <Card>
            <EmptyState title="Lead not found" description="It may have been deleted, or the link is wrong." />
          </Card>
        ) : (
          <ErrorPanel error={error} onRetry={reload} />
        )}
      </>
    );
  }
  if (loading || !lead) {
    return (
      <>
        {back}
        <div className="h-64 animate-pulse rounded-2xl bg-white shadow-soft" role="status" aria-label="Loading lead" />
      </>
    );
  }

  // Everyone who could own this lead: the staff list, the current assignee and (if staff) yourself.
  const me: UserRef | null = user && (user.role === "ADMIN" || user.role === "MANAGER") ? { id: user.id, name: `${user.firstName} ${user.lastName}`.trim(), email: user.email } : null;
  const assignees = new Map<string, UserRef>();
  for (const u of [...staff.list, lead.assignedTo, me]) if (u) assignees.set(u.id, u);

  return (
    <>
      {back}
      <PageHeader
        title={lead.name}
        description={`${LEAD_TYPE_LABEL[lead.type]} · received ${formatDateTime(lead.createdAt)}`}
        actions={<StatusPill status={lead.status} />}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Card title="Contact">
            <DetailList
              items={[
                { label: "Name", value: lead.name },
                { label: "Email", value: <ContactLink kind="email" value={lead.email} /> },
                { label: "Phone", value: <ContactLink kind="phone" value={lead.phone} /> },
                { label: "Company", value: lead.company },
              ]}
            />
          </Card>
          <Card title={`${LEAD_TYPE_LABEL[lead.type]} details`}>
            <DetailList items={[...detailItems(lead), { label: lead.type === "data_licence" ? "Use case" : "Message", value: lead.message, wide: true }]} />
          </Card>
          <NotesCard lead={lead} canManage={canManage} onChange={setUpdated} />
        </div>
        <div>
          <ManageCard lead={lead} canManage={canManage} assignees={[...assignees.values()]} staffLoading={staff.loading} staffFailed={staff.failed} onChange={setUpdated} />
        </div>
      </div>
    </>
  );
}

function ManageCard({
  lead,
  canManage,
  assignees,
  staffLoading,
  staffFailed,
  onChange,
}: {
  lead: Lead;
  canManage: boolean;
  assignees: UserRef[];
  staffLoading: boolean;
  staffFailed: boolean;
  onChange: (lead: Lead) => void;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [assignee, setAssignee] = useState(lead.assignedTo?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const dirty = status !== lead.status || assignee !== (lead.assignedTo?.id ?? "");

  async function save(e: FormEvent) {
    e.preventDefault();
    const body: { status?: LeadStatus; assignedTo?: string | null } = {};
    if (status !== lead.status) body.status = status;
    if (assignee !== (lead.assignedTo?.id ?? "")) body.assignedTo = assignee || null;
    setSaving(true);
    setFeedback(null);
    setFieldError(undefined);
    try {
      onChange(await apiRequest<Lead>("PATCH", `/admin/leads/${lead.id}`, body));
      setFeedback({ status: "success", message: "Changes saved." });
    } catch (err) {
      if (err instanceof ApiError && err.body.fieldErrors?.assignedTo) setFieldError(err.body.fieldErrors.assignedTo);
      setFeedback({ status: "error", message: errorMessage(err, "Couldn't save the changes.") });
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <Card title="Handling">
        <DetailList
          items={[
            { label: "Status", value: <StatusPill status={lead.status} /> },
            { label: "Assignee", value: lead.assignedTo?.name ?? "Unassigned" },
          ]}
        />
        <p className="mt-4 text-xs text-muted">You can view leads but not change them.</p>
      </Card>
    );
  }

  return (
    <Card title="Handling">
      <form onSubmit={save} className="flex flex-col gap-4">
        <Select label="Status" name="status" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select label="Assignee" name="assignedTo" value={assignee} onChange={(e) => setAssignee(e.target.value)} error={fieldError} disabled={staffLoading}>
          <option value="">Unassigned</option>
          {assignees.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </Select>
        {staffFailed && <p className="-mt-2 text-xs text-muted">Couldn&apos;t load the staff list — you can still assign the lead to yourself.</p>}
        {lead.updatedAt && <p className="text-xs text-muted">Last updated {formatDateTime(lead.updatedAt)}</p>}
        {feedback && <FormStatus status={feedback.status} message={feedback.message} />}
        <Button type="submit" loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}

function NotesCard({ lead, canManage, onChange }: { lead: Lead; canManage: boolean; onChange: (lead: Lead) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const notes = [...lead.notes].reverse();

  async function add(e: FormEvent) {
    e.preventDefault();
    const parsed = noteSchema.safeParse({ text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setFeedback(null);
    setSaving(true);
    try {
      onChange(await apiRequest<Lead>("POST", `/admin/leads/${lead.id}/notes`, parsed.data));
      setText("");
      setFeedback({ status: "success", message: "Note added." });
    } catch (err) {
      if (err instanceof ApiError && err.body.fieldErrors?.text) setError(err.body.fieldErrors.text);
      setFeedback({ status: "error", message: errorMessage(err, "Couldn't add the note.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={`Notes (${lead.notes.length})`}>
      {canManage && (
        <form onSubmit={add} className="mb-6 flex flex-col gap-3" noValidate>
          <Textarea
            label="Add a note"
            name="text"
            id="lead-note"
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            error={error}
            placeholder="Called back, sent the rate card…"
            className="min-h-[96px]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" loading={saving}>
              Add note
            </Button>
            <span className="text-xs text-subtle">{text.length}/2000</span>
          </div>
          {feedback && <FormStatus status={feedback.status} message={feedback.message} />}
        </form>
      )}
      {notes.length === 0 ? (
        <p className="text-sm text-muted">No notes yet.</p>
      ) : (
        <ol className="relative flex flex-col gap-5 border-l-2 border-line pl-5">
          {notes.map((n) => (
            <li key={n.id} className="relative">
              <span className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-white bg-brand" aria-hidden />
              <p className="text-xs text-muted">
                <span className="font-semibold text-ink">{n.by?.name ?? "Former staff member"}</span> · <time dateTime={n.at}>{formatDateTime(n.at)}</time>
              </p>
              <p className="mt-1 text-sm break-words whitespace-pre-line text-ink">{n.text}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
