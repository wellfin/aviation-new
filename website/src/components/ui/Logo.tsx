import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Book My FBO wordmark (white, for the dark header, footer and auth panels). */
export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center", className)} aria-label="Book My FBO — home">
      <Image
        src="/images/shared/logo-bookmyfbo.png"
        alt="Book My FBO"
        width={879}
        height={97}
        priority
        className={cn("w-auto", size === "lg" ? "h-[22px] sm:h-[26px]" : "h-[18px] sm:h-[22px]")}
      />
    </Link>
  );
}
