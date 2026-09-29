"use client";

import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Card, ConfirmButton, EmptyState, ErrorPanel, FilterBar, PageHeader, SearchFilter, SelectFilter, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input, Select, Textarea } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { fieldErrors, type FieldErrors } from "@/lib/api/forms";
import { useApi } from "@/lib/hooks/useApi";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { cn } from "@/lib/utils";
import { FAQ_CATEGORIES, faqFormSchema, type AdminFaq, type FaqCategory, type FaqFormValues } from "./schema";

type Feedback = { status: "success" | "error"; message: string } | null;
const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.body.message : fallback);

export function FaqsManager() {
  const { get } = useUrlParams();
  const { data, error, loading, reload } = useApi<AdminFaq[]>("/admin/faqs");
  const [list, setList] = useState<AdminFaq[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Local edits win over the fetched list until the next full reload.
  const [lastData, setLastData] = useState(data);
  if (lastData !== data) {
    setLastData(data);
    setList(null);
  }
  const faqs = list ?? data ?? [];

  const category = (FAQ_CATEGORIES as readonly string[]).includes(get("category")) ? (get("category") as FaqCategory) : "";
  const visibility = get("published");
  const q = get("q").trim().toLowerCase();
  const matches = (f: AdminFaq) =>
    (!category || f.category === category) &&
    (visibility === "true" ? f.published : visibility === "false" ? !f.published : true) &&
    (!q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  const groups = FAQ_CATEGORIES.map((c) => ({ category: c, all: faqs.filter((f) => f.category === c) }))
    .map((g) => ({ ...g, shown: g.all.filter(matches) }))
    .filter((g) => g.shown.length > 0);
  const filtered = Boolean(category || visibility || q);

  /** Swaps an FAQ with its neighbour in the same category and persists the full order. */
  async function move(faq: AdminFaq, dir: -1 | 1) {
    const siblings = faqs.filter((f) => f.category === faq.category);
    const neighbour = siblings[siblings.indexOf(faq) + dir];
    if (!neighbour) return;
    const previous = faqs;
    const next = [...faqs];
    const a = next.indexOf(faq);
    const b = next.indexOf(neighbour);
    [next[a], next[b]] = [next[b], next[a]];
    setList(next);
    setBusy(faq.id);
    setFeedback(null);
    try {
      setList(await apiRequest<AdminFaq[]>("PUT", "/admin/faqs/order", { ids: next.map((f) => f.id) }));
    } catch (err) {
      setList(previous);
      setFeedback({ status: "error", message: message(err, "Couldn't save the new order.") });
    } finally {
      setBusy(null);
    }
  }

  async function togglePublished(faq: AdminFaq) {
    setBusy(faq.id);
    setFeedback(null);
    try {
      const updated = await apiRequest<AdminFaq>("PATCH", `/admin/faqs/${faq.id}`, { published: !faq.published });
      setList(faqs.map((f) => (f.id === faq.id ? updated : f)));
      setFeedback({ status: "success", message: updated.published ? "FAQ published." : "FAQ hidden from the site." });
    } catch (err) {
      setFeedback({ status: "error", message: message(err, "Couldn't update the FAQ.") });
    } finally {
      setBusy(null);
    }
  }

  async function remove(faq: AdminFaq) {
    setFeedback(null);
    try {
      await apiRequest("DELETE", `/admin/faqs/${faq.id}`);
      setList(faqs.filter((f) => f.id !== faq.id));
      setFeedback({ status: "success", message: "FAQ deleted." });
    } catch (err) {
      setFeedback({ status: "error", message: message(err, "Couldn't delete the FAQ.") });
    }
  }

  return (
    <>
      <PageHeader
        title="FAQs"
        description="Questions shown on the FAQ page, grouped by category. Use the arrows to change the order within a category."
        actions={
          <Button size="sm" onClick={() => setCreating(true)} disabled={creating}>
            <Plus className="size-4" aria-hidden /> New FAQ
          </Button>
        }
      />
      <FilterBar>
        <SearchFilter placeholder="Search questions and answers" label="Search FAQs" />
        <SelectFilter param="category" label="Category" options={FAQ_CATEGORIES.map((c) => ({ value: c, label: c }))} />
        <SelectFilter param="published" label="Visibility" options={[{ value: "true", label: "Published" }, { value: "false", label: "Hidden" }]} />
      </FilterBar>

      {feedback && (
        <div className="mb-4" aria-live="polite">
          <FormStatus status={feedback.status} message={feedback.message} />
        </div>
      )}

      {creating && (
        <Card title="New FAQ" className="mb-6">
          <FaqForm
            initial={{ question: "", answer: "", category: category || FAQ_CATEGORIES[0], published: true }}
            submitLabel="Create FAQ"
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              const created = await apiRequest<AdminFaq>("POST", "/admin/faqs", values);
              setList([...faqs, created]);
              setCreating(false);
              setFeedback({ status: "success", message: "FAQ created." });
            }}
          />
        </Card>
      )}

      {error && !data ? (
        <ErrorPanel error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="flex flex-col gap-4" role="status" aria-label="Loading FAQs">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white shadow-soft" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState title="No FAQs match" description="Try changing the filters." />
          ) : (
            <EmptyState title="No FAQs yet" description="Add the first question for the FAQ page." />
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <Card key={g.category} title={g.category} actions={<span className="text-xs text-muted">{g.all.length} total</span>}>
              <ol className="divide-y divide-line">
                {g.shown.map((faq) => {
                  const pos = g.all.indexOf(faq);
                  return (
                    <li key={faq.id} className="py-4 first:pt-0 last:pb-0">
                      {editing === faq.id ? (
                        <FaqForm
                          initial={{ question: faq.question, answer: faq.answer, category: faq.category, published: faq.published }}
                          submitLabel="Save changes"
                          onCancel={() => setEditing(null)}
                          onSubmit={async (values) => {
                            const updated = await apiRequest<AdminFaq>("PATCH", `/admin/faqs/${faq.id}`, values);
                            setList(faqs.map((f) => (f.id === faq.id ? updated : f)));
                            setEditing(null);
                            setFeedback({ status: "success", message: "FAQ saved." });
                          }}
                        />
                      ) : (
                        <div className="flex flex-col gap-3 md:flex-row md:items-start">
                          <div className="flex shrink-0 gap-1.5 md:flex-col">
                            <OrderButton label={`Move "${faq.question}" up`} disabled={pos === 0 || busy !== null} onClick={() => move(faq, -1)}>
                              <ArrowUp className="size-4" />
                            </OrderButton>
                            <OrderButton label={`Move "${faq.question}" down`} disabled={pos === g.all.length - 1 || busy !== null} onClick={() => move(faq, 1)}>
                              <ArrowDown className="size-4" />
                            </OrderButton>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-ink">{faq.question}</p>
                            <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-muted">{faq.answer}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <StatusPill status={faq.published ? "published" : "hidden"} tone={faq.published ? "green" : "slate"} />
                            <button
                              type="button"
                              role="switch"
                              aria-checked={faq.published}
                              aria-label={`Published: ${faq.question}`}
                              disabled={busy !== null}
                              onClick={() => togglePublished(faq)}
                              className={cn("relative h-6 w-11 rounded-full transition disabled:opacity-50", faq.published ? "bg-success" : "bg-slate-300")}
                            >
                              <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition", faq.published && "translate-x-5")} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(faq.id)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:bg-surface"
                            >
                              <Pencil className="size-3.5" aria-hidden /> Edit
                            </button>
                            <ConfirmButton onConfirm={() => remove(faq)} confirmLabel="Delete">
                              Delete
                            </ConfirmButton>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function OrderButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg border border-line bg-white text-muted transition hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function FaqForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FaqFormValues;
  submitLabel: string;
  onSubmit: (values: FaqFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const idp = `faq-${initial.question ? "edit" : "new"}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = faqFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      if (err instanceof ApiError && err.body.fieldErrors) setErrors(err.body.fieldErrors);
      setFormError(message(err, "Couldn't save the FAQ."));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Input id={`${idp}-question`} name="question" label="Question" value={values.question} maxLength={300} onChange={(e) => setValues({ ...values, question: e.target.value })} error={errors.question} autoFocus />
      <Textarea id={`${idp}-answer`} name="answer" label="Answer" value={values.answer} maxLength={5000} onChange={(e) => setValues({ ...values, answer: e.target.value })} error={errors.answer} />
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <Select id={`${idp}-category`} name="category" label="Category" value={values.category} onChange={(e) => setValues({ ...values, category: e.target.value as FaqCategory })} error={errors.category}>
          {FAQ_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <label className="flex h-12 items-center gap-3 text-sm font-medium text-ink">
          <input type="checkbox" checked={values.published} onChange={(e) => setValues({ ...values, published: e.target.checked })} className="size-4 accent-brand" />
          Published on the FAQ page
        </label>
      </div>
      {formError && <FormStatus status="error" message={formError} />}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={saving}>
          {submitLabel}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
