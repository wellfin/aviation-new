import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "navy" | "outline" | "outline-light" | "ghost" | "ghost-light" | "success-outline";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-gradient text-white shadow-[0_4px_14px_rgba(47,128,237,0.35)] hover:brightness-110",
  navy: "bg-navy-900 text-white hover:bg-navy-800",
  outline: "border border-brand text-brand bg-white hover:bg-brand/5",
  "outline-light": "border border-brand-cyan text-brand-cyan hover:bg-white/5",
  ghost: "text-brand hover:bg-brand/5",
  "ghost-light": "bg-white/10 text-white hover:bg-white/15",
  "success-outline": "border border-success text-success bg-white hover:bg-success/5",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[13px] rounded-xl",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-[52px] px-7 text-base rounded-full",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
}

export function Button({ variant, size, className, children, loading, ...rest }: CommonProps & ComponentProps<"button"> & { loading?: boolean }) {
  return (
    <button className={buttonClasses(variant, size, className)} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, children, ...rest }: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
