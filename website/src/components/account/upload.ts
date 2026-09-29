"use client";

import { ApiError, apiRequest, type ApiErrorBody } from "@/lib/api/client";
import { publicConfig } from "@/lib/public-config";
import type { UploadResult } from "./types";

export type UploadKind = "image" | "document";

/** Client-side mirror of the backend limits (the API re-checks magic bytes and size). */
export const UPLOAD_RULES: Record<UploadKind, { accept: string; types: string[]; maxMb: number; label: string }> = {
  image: { accept: "image/png,image/jpeg,image/webp", types: ["image/png", "image/jpeg", "image/webp"], maxMb: 5, label: "PNG, JPG or WebP up to 5 MB" },
  document: { accept: "application/pdf", types: ["application/pdf"], maxMb: 15, label: "PDF up to 15 MB" },
};

function send(kind: UploadKind, file: File): Promise<Response> {
  const body = new FormData();
  body.append("kind", kind);
  body.append("file", file);
  return fetch(`${publicConfig.apiBaseUrl}/api/v1/uploads`, { method: "POST", credentials: "include", body });
}

/** Validates locally, then POSTs multipart to /uploads (refreshing an expired session once). */
export async function uploadFile(kind: UploadKind, file: File): Promise<UploadResult> {
  const rules = UPLOAD_RULES[kind];
  if (!rules.types.includes(file.type)) throw new ApiError(400, { code: "INVALID_FILE", message: `Unsupported file type. Use ${rules.label}.` });
  if (file.size > rules.maxMb * 1024 * 1024) throw new ApiError(400, { code: "FILE_TOO_LARGE", message: `That file is too large. Use ${rules.label}.` });

  let res: Response;
  try {
    res = await send(kind, file);
    if (res.status === 401) {
      const refreshed = await apiRequest("POST", "/auth/refresh").then(
        () => true,
        () => false,
      );
      if (refreshed) res = await send(kind, file);
    }
  } catch {
    throw new ApiError(0, { code: "NETWORK", message: "Upload failed. Check your connection and try again." });
  }

  const payload = (await res.json().catch(() => null)) as { data?: UploadResult; error?: ApiErrorBody } | null;
  if (!res.ok || !payload?.data) {
    const error = payload?.error ?? { code: "UPLOAD_FAILED", message: "Upload failed. Please try again." };
    // Field errors come back keyed by "file"; surface them as the main message.
    throw new ApiError(res.status, { ...error, message: error.fieldErrors?.file ?? error.message });
  }
  return payload.data;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
