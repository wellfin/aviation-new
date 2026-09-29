import Link from "next/link";
import { ArrowRight, Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const PERKS = ["List your FBO or Handling Services", "Reach operators & charter brokers", "Get discovered worldwide"];

/** Dark "Join the Global Network" provider sign-up card beside the tool tiles. */
export function JoinNetworkCard({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "flex flex-col items-center rounded-[16px] border border-brand-cyan/15 bg-[linear-gradient(161.6deg,#0b1f3a_8.5%,#0e3060_58.3%,#071423_91.5%)] p-5 text-white",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-brand/15" aria-hidden>
        <Globe className="size-7 text-brand" strokeWidth={1.75} />
      </span>
      <h2 className="pt-4 text-sm font-bold">Join the Global Network</h2>
      <ul className="flex w-full flex-col gap-2 pt-3">
        {PERKS.map((p) => (
          <li key={p} className="flex items-start gap-2 text-xs leading-4 text-white/70">
            <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
            {p}
          </li>
        ))}
      </ul>
      <Link
        href="/signup?type=provider"
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[25px] border-[1.5px] border-white/40 text-sm font-bold transition hover:border-white/70 hover:bg-white/5"
      >
        Register as Provider
        <ArrowRight className="size-3" aria-hidden />
      </Link>
    </aside>
  );
}
