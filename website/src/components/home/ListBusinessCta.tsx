import Image from "next/image";
import Link from "next/link";

/** "List Your Aviation Business Today" provider acquisition banner. */
export function ListBusinessCta() {
  return (
    <section aria-labelledby="list-business-heading" className="relative isolate overflow-hidden bg-[#001b45] text-white">
      <div className="absolute inset-y-0 right-0 -z-10 aspect-[1774/887] h-full max-md:opacity-40">
        <Image src="/images/home/cta-pilot.png" alt="" fill sizes="(max-width: 768px) 100vw, 900px" className="object-cover object-right" />
      </div>
      <div className="container-site py-16 md:py-[100px]">
        <h2 id="list-business-heading" className="max-w-[780px] text-[34px] leading-tight font-bold tracking-[-0.5px] md:text-5xl md:leading-[58px]">
          List Your Aviation Business Today
        </h2>
        <p className="mt-6 max-w-[620px] text-base leading-[27px] text-white/80 md:pl-1">
          Join 50,000+ aviation businesses. Get discovered by pilots, operators, and aviation professionals worldwide.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/signup?type=provider"
            className="inline-flex h-[54px] items-center rounded-full bg-brand-gradient px-9 text-base font-semibold shadow-[0_4px_14px_rgba(47,128,237,0.35)] transition hover:brightness-110"
          >
            Get Listed Free →
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-[54px] items-center rounded-full border-2 border-brand-cyan px-9 text-base font-semibold text-brand-cyan transition hover:bg-white/5"
          >
            View Pricing Plans
          </Link>
        </div>
      </div>
    </section>
  );
}
