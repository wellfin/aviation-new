"use client";

import "./globals.css";
import { ErrorSection } from "@/components/sections/ErrorSection";

/** Last-resort boundary (errors in the root layout). Must render its own <html>/<body>. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body className="bg-surface font-sans text-ink antialiased">
        <ErrorSection retry={retry} digest={error.digest} />
      </body>
    </html>
  );
}
