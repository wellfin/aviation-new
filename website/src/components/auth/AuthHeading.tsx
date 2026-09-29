import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Form heading. `centered` variant adds the emoji tile used on the email / reset screens. */
export function AuthHeading({
  title,
  subtitle,
  icon,
  centered = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn(centered && "text-center")}>
      {icon && (
        <div
          aria-hidden
          className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-brand/20 bg-[linear-gradient(135deg,rgba(47,128,237,0.12)_0%,rgba(0,194,255,0.08)_100%)] text-[30px] leading-9"
        >
          {icon}
        </div>
      )}
      <h1
        className={cn(
          "font-extrabold text-ink",
          centered ? "text-[26px] leading-[39px] tracking-[-0.52px]" : "text-[28px] leading-[42px] tracking-[-0.56px]",
        )}
      >
        {title}
      </h1>
      {subtitle && <div className={cn("text-sm text-subtle", centered ? "mt-2 leading-[22.4px]" : "mt-1.5 leading-5")}>{subtitle}</div>}
    </div>
  );
}
