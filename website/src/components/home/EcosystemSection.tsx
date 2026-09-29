import Image from "next/image";
import { ChartColumn, Globe, Plane, Sheet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stat {
  value: string;
  label: string;
  Icon: LucideIcon;
  tone: string;
  /** Position of the bubble over the plane illustration (desktop only), in % of the stage. */
  position: string;
  /** Horizontal offset of the speech-bubble tail from the bubble's left edge. */
  tailLeft: string;
  width: string;
}

const STATS: Stat[] = [
  { value: "20,000+", label: "Verified Service Providers", Icon: Plane, tone: "bg-brand/9 border-brand/19 text-brand", position: "lg:left-[23.7%] lg:top-[13%]", tailLeft: "left-[105px]", width: "lg:w-[240px]" },
  { value: "24/7", label: "Global Operations", Icon: ChartColumn, tone: "bg-success/9 border-success/19 text-success", position: "lg:left-[59.8%] lg:top-[12.7%]", tailLeft: "left-[82px]", width: "lg:w-[193px]" },
  { value: "180+", label: "Countries Covered", Icon: Globe, tone: "bg-brand-cyan/9 border-brand-cyan/19 text-brand-cyan", position: "lg:left-0 lg:top-[64.4%]", tailLeft: "left-[85px]", width: "lg:w-[200px]" },
  { value: "Real-Time", label: "Data & Updates", Icon: Sheet, tone: "bg-warning/9 border-warning/19 text-warning", position: "lg:right-0 lg:top-[64.4%]", tailLeft: "left-[82px]", width: "lg:w-[193px]" },
];

function StatBubble({ stat }: { stat: Stat }) {
  const { Icon } = stat;
  return (
    <li
      className={cn(
        "relative flex h-[78px] items-center gap-3 rounded-[16px] bg-white px-5 drop-shadow-[0_4px_12px_rgba(11,31,58,0.08)] lg:absolute lg:justify-center",
        stat.position,
        stat.width,
      )}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", stat.tone)} aria-hidden>
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-base leading-5 font-extrabold text-[#0b2c5c]">{stat.value}</span>
        <span className="text-[11px] leading-[13.75px] text-[#0b2c5c]/50">{stat.label}</span>
      </span>
      <Image
        src="/images/home/bubble-tail.svg"
        alt=""
        width={29}
        height={26}
        className={cn("absolute top-[calc(100%-6px)] hidden rotate-180 lg:block", stat.tailLeft)}
      />
    </li>
  );
}

/** "Building a More Connected Global Aviation Ecosystem" — copy + plane illustration with stat bubbles over a faint world map. */
export function EcosystemSection() {
  return (
    <section className="relative overflow-hidden pt-10 pb-6 md:pt-12" aria-labelledby="ecosystem-heading">
      <Image src="/images/home/world-map.png" alt="" fill sizes="100vw" className="-z-10 object-cover object-bottom opacity-10" />
      <div className="container-site text-center">
        <h2 id="ecosystem-heading" className="text-[28px] leading-9 font-extrabold tracking-[-1px] text-[#0b2c5c] md:text-4xl md:leading-[75px] md:tracking-[-1.5px]">
          Building a More Connected Global Aviation Ecosystem
        </h2>
        <p className="mx-auto mt-3 max-w-[1227px] text-lg leading-8 tracking-[-0.5px] text-subtle lg:mt-0 md:text-2xl md:leading-10 md:tracking-[-1.5px]">
          We connect aviation businesses and service providers worldwide, making trusted industry information easier to discover, access, and manage. Our
          platform brings the global aviation ecosystem together through verified providers, comprehensive data, and continuously updated information.
        </p>
      </div>
      <div className="container-site mt-8 md:mt-12">
        <div className="relative mx-auto max-w-[1288px]">
          <Image
            src="/images/home/ecosystem-plane.png"
            alt="Wide-body jet on the apron, representing the global aviation network"
            width={1288}
            height={393}
            sizes="(max-width: 1336px) 100vw, 1288px"
            className="h-auto w-full"
          />
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-0">
            {STATS.map((s) => (
              <StatBubble key={s.value} stat={s} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
