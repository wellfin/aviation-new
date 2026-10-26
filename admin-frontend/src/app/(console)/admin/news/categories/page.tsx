import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { NewsCategoriesManager } from "@/components/admin/news/NewsCategoriesManager";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "News categories" };

export default function AdminNewsCategoriesPage() {
  return (
    <>
      <PageHeader
        title="News categories"
        description="The categories articles are filed under. They appear as the tabs on the site's news page."
        actions={
          <ButtonLink href="/admin/news" size="sm" variant="ghost">
            <ArrowLeft className="size-4" aria-hidden /> All articles
          </ButtonLink>
        }
      />
      <NewsCategoriesManager />
    </>
  );
}
