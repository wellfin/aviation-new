"use client";

import { ArrowDown, ArrowUp, Check, Pencil, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Card, ConfirmButton, ErrorPanel } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { useApi } from "@/lib/hooks/useApi";

export interface AdminNewsCategory {
  id: string;
  name: string;
  order: number;
  articles: number;
}

type Feedback = { status: "success" | "error"; message: string } | null;
const message = (err: unknown, fallback: string) => (err instanceof ApiError ? (err.body.fieldErrors?.name ?? err.body.message) : fallback);
const iconBtn = "inline-flex size-9 items-center justify-center rounded-xl border border-line text-muted transition hover:bg-surface hover:text-ink disabled:opacity-40";

/** Add, rename, reorder and delete the news categories (news page tabs and the article Category list). */
export function NewsCategoriesManager() {
  const { data, error, loading, reload } = useApi<AdminNewsCategory[]>("/admin/news/categories");
  const [list, setList] = useState<AdminNewsCategory[] | null>(null);
  const [lastData, setLastData] = useState(data);
  if (lastData !== data) {
    setLastData(data);
    setList(null);
  }
  const cats = list ?? data ?? [];

  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function run(work: () => Promise<void>, done: string) {
    setBusy(true);
    setFeedback(null);
    try {
      await work();
      setFeedback({ status: "success", message: done });
    } catch (err) {
      setFeedback({ status: "error", message: message(err, "That didn't work. Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  function add(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) return setFeedback({ status: "error", message: "Enter a category name." });
    void run(async () => {
      const made = await apiRequest<AdminNewsCategory>("POST", "/admin/news/categories", { name: n });
      setList([...cats, made]);
      setName("");
    }, `Added "${n}".`);
  }

  function rename(id: string, value: string) {
    const n = value.trim();
    if (n.length < 2) return setFeedback({ status: "error", message: "Enter a category name." });
    void run(async () => {
      const saved = await apiRequest<AdminNewsCategory>("PATCH", `/admin/news/categories/${id}`, { name: n });
      setList(cats.map((c) => (c.id === id ? saved : c)));
      setEditing(null);
    }, `Renamed to "${n}". Its articles moved with it.`);
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...cats];
    [next[i], next[i + dir]] = [next[i + dir]!, next[i]!];
    setList(next);
    void run(async () => {
      setList(await apiRequest<AdminNewsCategory[]>("PUT", "/admin/news/categories/order", { ids: next.map((c) => c.id) }));
    }, "Order saved.");
  }

  async function remove(c: AdminNewsCategory) {
    await run(async () => {
      await apiRequest("DELETE", `/admin/news/categories/${c.id}`);
      setList(cats.filter((x) => x.id !== c.id));
    }, `Deleted "${c.name}".`);
  }

  if (error) return <ErrorPanel error={error} onRetry={reload} />;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card title="Add a category">
        <form onSubmit={add} className="flex items-end gap-3">
          <Input id="new-category" name="name" label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Safety" wrapperClassName="flex-1" />
          <Button type="submit" loading={busy && !editing}>
            <Plus className="size-4" aria-hidden /> Add
          </Button>
        </form>
      </Card>

      <Card title="Categories" actions={<span className="text-xs text-muted">Shown on the news page in this order</span>}>
        {feedback && (
          <div className="mb-3" aria-live="polite">
            <FormStatus status={feedback.status} message={feedback.message} />
          </div>
        )}
        {loading && !data ? (
          <p className="text-sm text-muted">Loading categories…</p>
        ) : (
          <ol className="flex flex-col divide-y divide-line">
            {cats.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-3">
                {editing?.id === c.id ? (
                  <form
                    className="flex min-w-0 flex-1 items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      rename(c.id, editing.name);
                    }}
                  >
                    <label htmlFor={`cat-${c.id}`} className="sr-only">
                      New name for {c.name}
                    </label>
                    <input
                      id={`cat-${c.id}`}
                      value={editing.name}
                      maxLength={60}
                      autoFocus
                      onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                      className="h-9 min-w-0 flex-1 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
                    />
                    <button type="submit" className={iconBtn} aria-label="Save name" disabled={busy}>
                      <Check className="size-4" />
                    </button>
                    <button type="button" className={iconBtn} aria-label="Cancel" onClick={() => setEditing(null)}>
                      <X className="size-4" />
                    </button>
                  </form>
                ) : (
                  <p className="min-w-0 flex-1 text-sm font-semibold text-ink">
                    {c.name}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {c.articles} {c.articles === 1 ? "article" : "articles"}
                    </span>
                  </p>
                )}
                <button type="button" className={iconBtn} disabled={i === 0 || busy} onClick={() => move(i, -1)} aria-label={`Move ${c.name} up`}>
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" className={iconBtn} disabled={i === cats.length - 1 || busy} onClick={() => move(i, 1)} aria-label={`Move ${c.name} down`}>
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing({ id: c.id, name: c.name })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:bg-surface"
                >
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </button>
                <ConfirmButton onConfirm={() => remove(c)} confirmLabel="Delete" disabled={busy || c.articles > 0}>
                  Delete
                </ConfirmButton>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-muted">A category that still has articles can&apos;t be deleted — move its articles to another category first, or rename it instead.</p>
      </Card>
    </div>
  );
}
