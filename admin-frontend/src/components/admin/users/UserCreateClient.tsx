"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Card, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { FormStatus, Input } from "@/components/ui/Field";
import { ApiError, apiRequest } from "@/lib/api/client";
import { can, useAuth } from "@/lib/auth/auth-context";
import { BUSINESS_EMAIL_MESSAGE, isBusinessEmail } from "@/lib/business-email";
import { RolePicker } from "./RolePicker";
import { requestFor, type RoleChoice } from "./roles";
import type { AdminUser } from "./shared";

const EMPTY = { firstName: "", lastName: "", email: "", password: "", phone: "", company: "" };

/** "Add user": an Admin creates an account with a password and a role. The email counts as confirmed. */
export function UserCreateClient() {
  const router = useRouter();
  const { user: me } = useAuth();
  const [v, setV] = useState(EMPTY);
  const [choice, setChoice] = useState<RoleChoice>("MANAGER");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const field = (k: keyof typeof EMPTY) => ({
    name: k,
    value: v[k],
    onChange: (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value })),
    error: errors[k],
  });

  function check(): Record<string, string> {
    const out: Record<string, string> = {};
    if (v.firstName.trim().length < 2) out.firstName = "Please enter at least 2 characters";
    if (v.lastName.trim().length < 2) out.lastName = "Please enter at least 2 characters";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) out.email = "Enter a valid email address";
    else if (!isBusinessEmail(v.email)) out.email = BUSINESS_EMAIL_MESSAGE;
    if (v.password.length < 8) out.password = "Use at least 8 characters";
    else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) out.password = "Include at least one letter and one number";
    return out;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const found = check();
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const { role, staffRole } = requestFor(choice);
      const created = await apiRequest<AdminUser>("POST", "/admin/users", {
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        email: v.email.trim().toLowerCase(),
        password: v.password,
        role,
        ...(staffRole ? { staffRole } : {}),
        ...(v.phone.trim() ? { phone: v.phone.trim() } : {}),
        ...(v.company.trim() ? { company: v.company.trim() } : {}),
      });
      router.push(`/admin/users/${created.id}?created=1`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body.fieldErrors) setErrors(err.body.fieldErrors);
        setMessage(err.body.message);
      } else setMessage("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  const back = (
    <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
      <ArrowLeft className="size-4" /> All users
    </Link>
  );

  if (!can(me, "users:manage")) {
    return (
      <>
        {back}
        <p className="rounded-xl border border-line bg-white p-6 text-sm text-muted">Only Admins can add users.</p>
      </>
    );
  }

  return (
    <>
      {back}
      <PageHeader title="Add user" description="Create an account and choose what the person can do. Share the password with them; they can change it after signing in." />
      {message && (
        <div className="mb-4">
          <FormStatus status="error" message={message} />
        </div>
      )}
      <form onSubmit={submit} noValidate className="grid items-start gap-4 lg:grid-cols-[1fr_400px]">
        <Card title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name *" {...field("firstName")} maxLength={100} autoComplete="off" />
            <Input label="Last name *" {...field("lastName")} maxLength={100} autoComplete="off" />
            <Input label="Work email *" type="email" {...field("email")} maxLength={254} autoComplete="off" hint="Personal addresses (Gmail, Yahoo, Outlook…) aren't accepted." wrapperClassName="sm:col-span-2" />
            <Input
              label="Password *"
              type={showPassword ? "text" : "password"}
              {...field("password")}
              maxLength={128}
              autoComplete="new-password"
              hint="At least 8 characters, with a letter and a number."
              wrapperClassName="sm:col-span-2"
              trailing={
                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? "Hide password" : "Show password"} className="text-muted hover:text-ink">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />
            <Input label="Phone" type="tel" {...field("phone")} maxLength={30} />
            <Input label="Company" {...field("company")} maxLength={120} />
          </div>
        </Card>
        <div className="flex flex-col gap-4">
          <Card title="Role">
            <RolePicker value={choice} onChange={setChoice} />
            {errors.staffRole && <p className="mt-2 text-xs font-medium text-danger">{errors.staffRole}</p>}
          </Card>
          <Button type="submit" loading={saving} className="w-full">
            Add user
          </Button>
        </div>
      </form>
    </>
  );
}
