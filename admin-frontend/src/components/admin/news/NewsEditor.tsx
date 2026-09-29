"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Card, ConfirmButton, EmptyState, ErrorPanel, PageHeader, StatusPill, formatDateTime } from "@/components/admin/ui";
import { BackLink } from "@/components/admin/enquiries/DetailList";
import { Button } from "@/components/ui/Button";
import { FieldError, FormStatus, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { fieldErrors, type FieldErrors } from "@/lib/api/forms";
import { useApi } from "@/lib/hooks/useApi";
import { slugify } from "@/lib/utils";
import { ImageUploadField } from "./ImageUploadField";
import { NEWS_CATEGORIES, newsFormSchema, type AdminNews, type NewsFormValues, type NewsStatus } from "./schema";
import { siteUrl } from "./site";

type Feedback = { status: "success" | "error"; message: string } | null;

const EMPTY: NewsFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  category: "Industry News",
  image: "",
  body: [""],
  author: "",
  authorRole: "",
  featured: false,
};

function toValues(n: AdminNews): NewsFormValues {
  return {
    title: n.title,
    slug: n.slug,
    excerpt: n.excerpt,
    category: n.category,
    image: n.image,
    body: n.body.length ? [...n.body] : [""],
    author: n.author,
    authorRole: n.authorRole,
    featured: n.featured,
  };
}

/** `/admin/news/new` (no id) or `/admin/news/[id]`. */
export function NewsEditor({ id }: { id?: string }) {
  const { data, error, loading, reload } = useApi<AdminNews>(id ? `/admin/news/${encodeURIComponent(id)}` : null);
  const back = <BackLink href="/admin/news">All articles</BackLink>;

  if (!id) {
    return (
      <>
        {back}
        <PageHeader title="New article" description="Drafts stay private until you publish them." />
        <NewsForm />
      </>
    );
  }
  if (error && !data) {
    const missing = error.status === 404 || error.status === 422;
    return (
      <>
        {back}
        {missing ? (
          <Card>
            <EmptyState title="Article not found" description="It may have been deleted." />
          </Card>
        ) : (
          <ErrorPanel error={error} onRetry={reload} />
        )}
      </>
    );
  }
  if (loading || !data) {
    return (
      <>
        {back}
        <div className="h-96 animate-pulse rounded-2xl bg-white shadow-soft" role="status" aria-label="Loading article" />
      </>
    );
  }
  return (
    <>
      {back}
      <NewsForm article={data} />
    </>
  );
}

function NewsForm({ article: initial }: { article?: AdminNews }) {
  const router = useRouter();
  const justCreated = useSearchParams().get("created") === "1";
  const [article, setArticle] = useState<AdminNews | undefined>(initial);
  const [values, setValues] = useState<NewsFormValues>(initial ? toValues(initial) : EMPTY);
  const [saved, setSaved] = useState<NewsFormValues>(values);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<"save" | "publish" | "unpublish" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(justCreated ? { status: "success", message: "Article created." } : null);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const set = <K extends keyof NewsFormValues>(key: K, value: NewsFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  /** Validates; returns the payload or null (errors shown). */
  function validate() {
    const parsed = newsFormSchema.safeParse(values);
    const errs: FieldErrors = parsed.success ? {} : fieldErrors(parsed.error);
    if (article && !values.slug.trim()) errs.slug = "Slug is required";
    setErrors(errs);
    if (!parsed.success || Object.keys(errs).length) {
      setFeedback({ status: "error", message: "Please fix the highlighted fields." });
      return null;
    }
    return parsed.data;
  }

  function fail(err: unknown, fallback: string) {
    if (err instanceof ApiError && err.body.fieldErrors) setErrors(err.body.fieldErrors);
    setFeedback({ status: "error", message: err instanceof ApiError ? err.body.message : fallback });
  }

  async function create(status: NewsStatus) {
    const data = validate();
    if (!data) return;
    setBusy(status === "published" ? "publish" : "save");
    setFeedback(null);
    try {
      const { slug, ...rest } = data;
      const created = await apiRequest<AdminNews>("POST", "/admin/news", { ...rest, ...(slug ? { slug } : {}), status });
      router.replace(`/admin/news/${created.id}?created=1`);
    } catch (err) {
      fail(err, "Couldn't create the article.");
      setBusy(null);
    }
  }

  /** PATCHes the form; returns the saved article or null. */
  async function saveChanges(): Promise<AdminNews | null> {
    if (!article) return null;
    const data = validate();
    if (!data) return null;
    const next = await apiRequest<AdminNews>("PATCH", `/admin/news/${article.id}`, data);
    setArticle(next);
    const v = toValues(next);
    setValues(v);
    setSaved(v);
    return next;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!article) return create("draft");
    setBusy("save");
    setFeedback(null);
    try {
      if (await saveChanges()) setFeedback({ status: "success", message: "Changes saved." });
    } catch (err) {
      fail(err, "Couldn't save the article.");
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(status: NewsStatus) {
    if (!article) return create(status);
    setBusy(status === "published" ? "publish" : "unpublish");
    setFeedback(null);
    try {
      if (dirty && !(await saveChanges())) return;
      const next = await apiRequest<AdminNews>("POST", `/admin/news/${article.id}/${status === "published" ? "publish" : "unpublish"}`);
      setArticle(next);
      setFeedback({ status: "success", message: status === "published" ? "Article published." : "Article moved back to drafts." });
    } catch (err) {
      fail(err, "Couldn't change the status.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!article) return;
    try {
      await apiRequest("DELETE", `/admin/news/${article.id}`);
      router.push("/admin/news");
    } catch (err) {
      fail(err, "Couldn't delete the article.");
    }
  }

  const published = article?.status === "published";

  return (
    <form onSubmit={onSubmit} noValidate>
      {article && (
        <PageHeader
          title={article.title}
          description={`Updated ${formatDateTime(article.updatedAt)}${article.publishedAt ? ` · published ${formatDateTime(article.publishedAt)}` : ""} · ${article.readMinutes} min read`}
          actions={
            <>
              <StatusPill status={article.status} />
              {published && (
                <a href={siteUrl(`/news/${article.slug}`)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                  View on site <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </>
          }
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <Card title="Article">
            <div className="flex flex-col gap-4">
              <Input id="title" name="title" label="Title" value={values.title} onChange={(e) => set("title", e.target.value)} error={errors.title} maxLength={200} required />
              <Input
                id="slug"
                name="slug"
                label="Slug"
                value={values.slug}
                onChange={(e) => set("slug", e.target.value.toLowerCase())}
                error={errors.slug}
                maxLength={120}
                placeholder={slugify(values.title) || "generated-from-the-title"}
                hint={article ? `The article lives at /news/${values.slug || "…"}. Changing it breaks existing links.` : "Leave blank to generate it from the title."}
              />
              <Textarea id="excerpt" name="excerpt" label="Excerpt" value={values.excerpt} onChange={(e) => set("excerpt", e.target.value)} error={errors.excerpt} maxLength={500} className="min-h-[88px]" />
              <ImageUploadField id="image" label="Cover image" value={values.image} onChange={(url) => set("image", url)} error={errors.image} />
            </div>
          </Card>
          <BodyEditor paragraphs={values.body} onChange={(body) => set("body", body)} errors={errors} />
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Details">
            <div className="flex flex-col gap-4">
              <Select id="category" name="category" label="Category" value={values.category} onChange={(e) => set("category", e.target.value as NewsFormValues["category"])} error={errors.category}>
                {NEWS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Input id="author" name="author" label="Author" value={values.author} onChange={(e) => set("author", e.target.value)} error={errors.author} maxLength={120} />
              <Input id="authorRole" name="authorRole" label="Author role" value={values.authorRole} onChange={(e) => set("authorRole", e.target.value)} error={errors.authorRole} maxLength={120} placeholder="Senior Editor" />
              <label className="flex items-center gap-3 text-sm font-medium text-ink">
                <input type="checkbox" checked={values.featured} onChange={(e) => set("featured", e.target.checked)} className="size-4 accent-brand" />
                Featured on the news page
              </label>
            </div>
          </Card>

          <Card title="Publishing" className="xl:sticky xl:top-24">
            <div className="flex flex-col gap-3">
              {feedback && (
                <div aria-live="polite">
                  <FormStatus status={feedback.status} message={feedback.message} />
                </div>
              )}
              {article ? (
                <>
                  <Button type="submit" loading={busy === "save"} disabled={busy !== null || !dirty}>
                    Save changes
                  </Button>
                  {published ? (
                    <Button type="button" variant="outline" loading={busy === "unpublish"} disabled={busy !== null} onClick={() => setStatus("draft")}>
                      Unpublish
                    </Button>
                  ) : (
                    <Button type="button" variant="navy" loading={busy === "publish"} disabled={busy !== null} onClick={() => setStatus("published")}>
                      {dirty ? "Save & publish" : "Publish"}
                    </Button>
                  )}
                  {dirty && <p className="text-xs text-muted">You have unsaved changes.</p>}
                  <div className="mt-2 border-t border-line pt-4">
                    <ConfirmButton onConfirm={remove} confirmLabel="Delete article" disabled={busy !== null}>
                      Delete
                    </ConfirmButton>
                  </div>
                </>
              ) : (
                <>
                  <Button type="submit" variant="outline" loading={busy === "save"} disabled={busy !== null}>
                    Save draft
                  </Button>
                  <Button type="button" loading={busy === "publish"} disabled={busy !== null} onClick={() => setStatus("published")}>
                    Save &amp; publish
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}

function BodyEditor({ paragraphs, onChange, errors }: { paragraphs: string[]; onChange: (body: string[]) => void; errors: FieldErrors }) {
  const move = (i: number, dir: -1 | 1) => {
    const next = [...paragraphs];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  const iconBtn = "flex size-8 items-center justify-center rounded-lg border border-line bg-white text-muted transition hover:text-ink disabled:opacity-30";

  return (
    <Card
      title="Body"
      actions={
        <span className="text-xs text-muted">
          {paragraphs.length} paragraph{paragraphs.length === 1 ? "" : "s"}
        </span>
      }
    >
      <ol className="flex flex-col gap-4">
        {paragraphs.map((p, i) => (
          <li key={i} className="flex gap-3">
            <div className="min-w-0 flex-1">
              <Label htmlFor={`body-${i}`}>Paragraph {i + 1}</Label>
              <Textarea
                id={`body-${i}`}
                name={`body-${i}`}
                value={p}
                maxLength={10_000}
                onChange={(e) => onChange(paragraphs.map((x, j) => (j === i ? e.target.value : x)))}
                error={errors[`body.${i}`]}
                className="min-h-[110px]"
              />
            </div>
            <div className="flex flex-col gap-1.5 pt-6">
              <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move paragraph ${i + 1} up`}>
                <ArrowUp className="size-4" />
              </button>
              <button type="button" className={iconBtn} disabled={i === paragraphs.length - 1} onClick={() => move(i, 1)} aria-label={`Move paragraph ${i + 1} down`}>
                <ArrowDown className="size-4" />
              </button>
              <button
                type="button"
                className={`${iconBtn} hover:text-danger`}
                disabled={paragraphs.length === 1}
                onClick={() => onChange(paragraphs.filter((_, j) => j !== i))}
                aria-label={`Remove paragraph ${i + 1}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <FieldError id="body-error" message={errors.body} />
      <Button type="button" variant="ghost" size="sm" className="mt-3" disabled={paragraphs.length >= 100} onClick={() => onChange([...paragraphs, ""])}>
        <Plus className="size-4" aria-hidden /> Add paragraph
      </Button>
    </Card>
  );
}
