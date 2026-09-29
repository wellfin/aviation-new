"use client";

import { useEffect } from "react";
import { ErrorSection } from "@/components/sections/ErrorSection";

/** Keeps the site header/footer when a page's data fails to load. */
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorSection retry={retry} digest={error.digest} />;
}
