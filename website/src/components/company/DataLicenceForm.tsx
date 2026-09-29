"use client";

import { apiPost } from "@/lib/api/client";
import { dataLicenceSchema } from "@/lib/api/forms";
import { useZodForm } from "@/lib/hooks/useZodForm";
import { Button } from "@/components/ui/Button";
import { FieldError, FormStatus, Input, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

/** FormData → payload with `datasets` collected from every checked box. */
function toPayload(fd: FormData): Record<string, unknown> {
  return {
    name: fd.get("name") ?? "",
    email: fd.get("email") ?? "",
    company: fd.get("company") ?? "",
    datasets: fd.getAll("datasets").map(String),
    useCase: fd.get("useCase") ?? "",
  };
}

export function DataLicenceForm({ datasets }: { datasets: Array<{ id: string; name: string }> }) {
  const { errors, submitting, result, handleSubmit } = useZodForm(
    dataLicenceSchema,
    async (data) => {
      await apiPost("/data-licence/requests", data);
      return "Thanks — our data team will send licence options and sample files for your selected datasets within one business day.";
    },
    { transform: toPayload },
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Full name *" autoComplete="name" placeholder="Sarah Mitchell" error={errors.name} />
        <Input name="company" label="Company *" autoComplete="organization" placeholder="SkyOps Software Ltd" error={errors.company} />
      </div>
      <Input name="email" type="email" label="Work email *" autoComplete="email" placeholder="sarah@skyops.aero" error={errors.email} />

      <fieldset aria-describedby={errors.datasets ? "datasets-error" : undefined}>
        <legend className="mb-2 block text-xs font-semibold tracking-[0.6px] text-muted uppercase">Datasets *</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {datasets.map((d) => (
            <label
              key={d.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-medium text-ink transition hover:border-brand/40 has-[:checked]:border-brand has-[:checked]:bg-brand/5",
                errors.datasets ? "border-danger/50" : "border-line",
              )}
            >
              <input type="checkbox" name="datasets" value={d.id} className="size-4 accent-brand" />
              {d.name}
            </label>
          ))}
        </div>
        <FieldError id="datasets-error" message={errors.datasets} />
      </fieldset>

      <Textarea
        name="useCase"
        label="Use case *"
        rows={4}
        placeholder="Describe your product or project, expected request volume, and how you plan to use the data..."
        error={errors.useCase}
      />

      {result.status !== "idle" && <FormStatus status={result.status} message={result.message} />}

      <Button type="submit" loading={submitting} className="h-[52px] w-full text-base">
        {submitting ? "Sending request…" : "Request Data →"}
      </Button>
    </form>
  );
}
