"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api/client";

interface State<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

/**
 * GET a signed-in API resource from the browser (dashboards, admin).
 * Pass `null` to skip. `reload()` refetches; results from stale requests are ignored.
 */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: path !== null });
  const [nonce, setNonce] = useState(0);

  // Reset to loading when the requested path changes (state derived from props, not an effect).
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setState((s) => ({ ...s, loading: path !== null, error: null }));
  }

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    apiRequest<T>("GET", path)
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const error = err instanceof ApiError ? err : new ApiError(0, { code: "NETWORK", message: "Couldn't reach the server. Check your connection." });
        setState((s) => ({ data: s.data, error, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

/** Builds `/path?a=1&b=2`, skipping empty values. */
export function withQuery(path: string, params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}
