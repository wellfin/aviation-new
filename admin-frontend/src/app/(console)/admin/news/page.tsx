import type { Metadata } from "next";
import { Plus, Tags } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { NewsList } from "@/components/admin/news/NewsList";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "News" };

export default function AdminNewsPage() {
  return (
    <>
      <PageHeader
        title="News"
        description="Articles for the site's news section. Only published articles are visible to visitors."
        actions={
          <>
            <ButtonLink href="/admin/news/categories" size="sm" variant="ghost">
              <Tags className="size-4" aria-hidden /> Categories
            </ButtonLink>
            <ButtonLink href="/admin/news/new" size="sm">
              <Plus className="size-4" aria-hidden /> New article
            </ButtonLink>
          </>
        }
      />
      <Suspense>
        <NewsList />
      </Suspense>
    </>
  );
}
