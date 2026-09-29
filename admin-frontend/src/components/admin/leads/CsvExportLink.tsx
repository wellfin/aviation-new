"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { apiRequest } from "@/lib/api/client";
import { withQuery } from "@/lib/hooks/useApi";
import { publicConfig } from "@/lib/public-config";

/**
 * Link to a cookie-authenticated CSV export on the API. Access tokens are
 * short-lived, so the click first touches `/admin/auth/me` (which transparently
 * refreshes an expired session) and then starts the download.
 */
export function CsvExportLink({ path, params, label = "Export CSV", title }: { path: string; params: Record<string, string | undefined>; label?: string; title?: string }) {
  const [busy, setBusy] = useState(false);
  const href = `${publicConfig.apiBaseUrl}/api/v1${withQuery(path, params)}`;
  return (
    <a
      href={href}
      title={title}
      aria-busy={busy || undefined}
      onClick={async (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        setBusy(true);
        try {
          await apiRequest("GET", "/admin/auth/me");
        } catch {
          // The export itself will report the auth problem.
        } finally {
          setBusy(false);
        }
        // Absolute URL on the API host (a file download), not an internal page.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(href);
      }}
      className={buttonClasses("outline", "sm")}
    >
      <Download className="size-4" aria-hidden /> {busy ? "Preparing…" : label}
    </a>
  );
}
