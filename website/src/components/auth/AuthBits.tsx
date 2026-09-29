import Link from "next/link";
import type { ReactNode } from "react";
import { publicConfig } from "@/lib/public-config";

/** "Already have an account? Sign in" style line under a form. */
export function AuthSwitch({ prompt, href, cta }: { prompt: string; href: string; cta: string }) {
  return (
    <p className="pt-6 text-center text-sm text-subtle">
      {prompt}{" "}
      <Link href={href} className="font-bold text-brand hover:underline">
        {cta}
      </Link>
    </p>
  );
}

/** Small demo-mode hint. Renders nothing when talking to the real backend. */
export function MockHint({ children }: { children: ReactNode }) {
  if (publicConfig.dataSource !== "mock") return null;
  return (
    <p className="mt-6 rounded-xl border border-dashed border-brand/30 bg-brand/4 px-3 py-2 text-center text-xs leading-5 text-muted">
      <span className="font-semibold text-brand">Demo mode</span> · {children}
    </p>
  );
}
