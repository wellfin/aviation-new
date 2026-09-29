import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="bg-hero-navy flex min-h-screen flex-col items-center justify-center px-4 text-center text-white">
      <Logo size="lg" className="mb-10" />
      <p className="font-mono text-sm tracking-[2px] text-brand-cyan">ERROR 404 · ROUTE NOT FOUND</p>
      <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">This flight plan has no destination</h1>
      <p className="mt-4 max-w-md text-white/60">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" size="lg">
          Back to Home
        </ButtonLink>
        <ButtonLink href="/directory" variant="outline-light" size="lg">
          Browse Directory
        </ButtonLink>
      </div>
    </div>
  );
}
