import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

/** Friendly "nothing matched" block with a reset link. */
export function EmptyResults({
  title = "No providers found",
  message,
  resetHref,
  resetLabel = "Clear filters",
}: {
  title?: string;
  message: string;
  resetHref: string;
  resetLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-[20px] border border-dashed border-brand/25 bg-white px-6 py-16 text-center shadow-soft">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <SearchX className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted">{message}</p>
      <ButtonLink href={resetHref} variant="outline" size="sm" className="mt-6 rounded-full">
        {resetLabel}
      </ButtonLink>
    </div>
  );
}
