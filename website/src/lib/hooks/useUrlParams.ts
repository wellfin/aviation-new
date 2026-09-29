"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Reads/writes list state (filters, search, page) in the URL so views are
 * shareable and survive reloads. Changing any filter resets `page`.
 */
export function useUrlParams() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const get = useCallback((key: string, fallback = "") => params.get(key) ?? fallback, [params]);

  const set = useCallback(
    (updates: Record<string, string | number | undefined | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === null || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      if (!("page" in updates)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return { params, get, set, page: Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1) };
}
