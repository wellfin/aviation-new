"use client";

import { useEffect, useRef, useState } from "react";

/** Splits "20,000+" → 20000 + "+", "24/7" → 24 + "/7". Returns null when the value doesn't start with a number. */
function parse(value: string): { target: number; suffix: string } | null {
  const m = /^(\d[\d,]*)(.*)$/.exec(value.trim());
  if (!m) return null;
  return { target: Number(m[1]!.replace(/,/g, "")), suffix: m[2] ?? "" };
}

const format = (n: number) => n.toLocaleString("en-US");

/**
 * Animated stat: counts from 0 up to the leading number of `value` the first time it
 * scrolls into view ("20,000+", "180+", "24/7"). Non-numeric values ("Real-Time") render
 * as-is. The server renders the final value, so it is correct without JavaScript, and
 * visitors who prefer reduced motion never see the animation.
 */
export function CountUp({ value, durationMs = 1600, className }: { value: string; durationMs?: number; className?: string }) {
  const parsed = parse(value);
  const target = parsed?.target ?? 0;
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !parsed || target <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          // Ease-out: fast at first, settling gently on the final number.
          setShown(Math.round(target * (1 - (1 - t) ** 3)));
          if (t < 1) frame = requestAnimationFrame(tick);
          else setShown(null);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // `parsed` is derived from `value`; target covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {/* Screen readers always get the real value, not the intermediate numbers. */}
      <span className="sr-only">{value}</span>
      <span aria-hidden>{parsed && shown !== null ? `${format(shown)}${parsed.suffix}` : value}</span>
    </span>
  );
}
