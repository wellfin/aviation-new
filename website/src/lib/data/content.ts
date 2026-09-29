import "server-only";
import { AD_FORMATS, type AdFormat } from "@/components/advertise/formats";
import { config } from "@/lib/config";
import { ADS } from "@/lib/mock/ads";
import { FAQS } from "@/lib/mock/faq";
import { NEWS } from "@/lib/mock/news";
import type { Advertisement, FaqItem, NewsArticle, NewsCategory, Paginated } from "@/lib/types";
import { paginate } from "@/lib/utils";
import { apiGet, buildQuery, clampPage, clampPageSize, clampQuery, SLUG_RE } from "./http";

export interface NewsQuery {
  q?: string;
  category?: NewsCategory | "all";
  page?: number;
  pageSize?: number;
}

export async function listNews(query: NewsQuery = {}): Promise<Paginated<NewsArticle>> {
  const { category = "all" } = query;
  const q = clampQuery(query.q);
  const page = clampPage(query.page);
  const pageSize = clampPageSize(query.pageSize, 9, 50);
  if (config.DATA_SOURCE === "mock") {
    const needle = q.trim().toLowerCase();
    const list = NEWS.filter(
      (n) => (category === "all" || n.category === category) && (!needle || `${n.title} ${n.excerpt}`.toLowerCase().includes(needle)),
    ).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return paginate(list, page, pageSize);
  }
  return (
    (await apiGet<Paginated<NewsArticle>>(`/news${buildQuery({ q, category, page, pageSize })}`)) ?? {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    }
  );
}

export async function getNewsArticle(slug: string): Promise<NewsArticle | null> {
  if (config.DATA_SOURCE === "mock") return NEWS.find((n) => n.slug === slug) ?? null;
  if (!SLUG_RE.test(slug)) return null;
  return apiGet<NewsArticle>(`/news/${encodeURIComponent(slug)}`);
}

export async function listFaqs(category?: string): Promise<FaqItem[]> {
  if (config.DATA_SOURCE === "mock") return category ? FAQS.filter((f) => f.category === category) : FAQS;
  return (await apiGet<FaqItem[]>(`/faqs${buildQuery({ category: category?.slice(0, 100) })}`)) ?? [];
}

export async function getAdvertisement(placement: Advertisement["placement"]): Promise<Advertisement | null> {
  if (config.DATA_SOURCE === "mock") {
    const pool = ADS.filter((a) => a.placement === placement);
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }
  try {
    // Never cached: the API picks a (weighted) random eligible ad per request, so different
    // visitors — and repeat page views — see different advertisers, and each view is counted.
    // Ad slots are optional decoration: an ad-server failure must never break the page.
    return await apiGet<Advertisement>(`/ads/serve${buildQuery({ placement })}`, { noStore: true });
  } catch {
    return null;
  }
}

/** Advertising packages shown on the Advertise page (admin-managed in API mode). */
export async function listAdFormats(): Promise<AdFormat[]> {
  if (config.DATA_SOURCE === "mock") return AD_FORMATS;
  return (await apiGet<AdFormat[]>("/advertising/formats", { revalidate: 60 })) ?? [];
}
