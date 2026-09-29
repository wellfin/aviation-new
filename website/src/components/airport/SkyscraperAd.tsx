import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Tall right-rail house ad ("Your partner in flight") promoting advertising slots. */
export function SkyscraperAd({ className }: { className?: string }) {
  return (
    <Link
      href="/advertise"
      rel="sponsored"
      aria-label="Advertise here: your partner in flight, around the clock and around the globe"
      className={cn("relative block h-[688px] overflow-hidden rounded-[24px] bg-[#cfe0f3]", className)}
    >
      <Image src="/images/airport/ad-partner-in-flight.png" alt="" width={120} height={600} sizes="272px" className="absolute top-[-78.67%] left-0 h-[250.46%] w-full max-w-none" />
      <span className="absolute top-3.5 right-3.5 rounded-full border border-success/25 bg-success/12 px-2.5 py-1 text-[11px] leading-[16.5px] font-bold tracking-[0.55px] text-success uppercase">
        ad
      </span>
    </Link>
  );
}
