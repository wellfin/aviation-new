import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-10" : "size-9";
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="Global Aviation Services Directory — home">
      <span className={cn("bg-brand-gradient flex shrink-0 items-center justify-center rounded-xl", box)}>
        <Image src="/images/shared/logo-plane.svg" alt="" width={20} height={20} priority />
      </span>
      <span className="flex flex-col">
        <span className={cn("font-bold leading-4 text-white", size === "lg" ? "text-[15px]" : "text-[13px]")}>Global Aviation</span>
        <span className="font-mono text-[10px] leading-[15px] tracking-[1px] text-brand-cyan">SERVICES DIRECTORY</span>
      </span>
    </Link>
  );
}
