/* eslint-disable @next/next/no-img-element -- tiny static SVGs; next/image adds nothing here */
import { cn } from "@/lib/utils";

/**
 * Country flag image (public/flags/<CC>.svg). Flag emoji aren't rendered on
 * Windows (they show as "GB", "FR"…), so flags are always images.
 * Decorative by default; pass `label` when the flag itself carries meaning.
 */
export function Flag({ code, className, label }: { code: string; className?: string; label?: string }) {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  return (
    <img
      src={`/flags/${cc}.svg`}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={18}
      height={12}
      loading="lazy"
      decoding="async"
      className={cn("inline-block h-3 w-[18px] shrink-0 rounded-[2px] object-cover align-[-1px] shadow-[0_0_0_0.5px_rgba(11,31,58,0.15)]", className)}
    />
  );
}
