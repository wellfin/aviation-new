import { publicConfig } from "@/lib/public-config";

const base = publicConfig.siteUrl.replace(/\/+$/, "");

/** Absolute URL of a page or asset on the public website (the console runs on its own origin). */
export function siteUrl(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") ? `${base}${path}` : path;
}
