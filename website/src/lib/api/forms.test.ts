import { describe, expect, it } from "vitest";
import { isBusinessEmail } from "@/lib/business-email";
import { advertiseSchema, contactSchema, dataLicenceSchema, demoRequestSchema, enquirySchema, fieldErrors, loginSchema, otpSchema, passwordStrength, resetPasswordSchema, signupSchema, workEmail } from "./forms";

describe("signupSchema", () => {
  const valid = { firstName: "James", lastName: "Henderson", email: "captain@airline.com", password: "Flight123" };

  it("accepts a valid registration", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects weak passwords with a helpful message", () => {
    const r = signupSchema.safeParse({ ...valid, password: "short" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).password).toMatch(/8 characters/);
  });

  it("requires a digit in the password", () => {
    expect(signupSchema.safeParse({ ...valid, password: "NoDigitsHere" }).success).toBe(false);
  });

  it("rejects invalid emails and trims names", () => {
    const r = signupSchema.safeParse({ ...valid, email: "not-an-email", firstName: "  J  " });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = fieldErrors(r.error);
      expect(e.email).toBeDefined();
      expect(e.firstName).toBeDefined();
    }
  });
});

describe("loginSchema / otpSchema", () => {
  it("requires a password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
  it("only accepts 6-digit codes", () => {
    expect(otpSchema.safeParse({ email: "a@b.co", code: "123456" }).success).toBe(true);
    expect(otpSchema.safeParse({ email: "a@b.co", code: "12345a" }).success).toBe(false);
    expect(otpSchema.safeParse({ email: "a@b.co", code: "1234567" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const r = resetPasswordSchema.safeParse({ password: "Flight123", confirmPassword: "Flight124" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).confirmPassword).toBe("Passwords do not match");
  });
});

describe("contact & enquiry schemas", () => {
  it("rejects too-short messages and bad phone numbers", () => {
    const r = contactSchema.safeParse({ name: "Ann", email: "ann@x.io", phone: "call me", subject: "Hi", message: "short" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = fieldErrors(r.error);
      expect(e.phone).toBeDefined();
      expect(e.message).toBeDefined();
    }
  });
  it("treats an empty optional phone as valid", () => {
    const r = enquirySchema.safeParse({ providerSlug: "x", name: "Ann Lee", email: "ann@x.io", phone: "", service: "Fuel", message: "Need a fuel quote for Friday." });
    expect(r.success).toBe(true);
  });
});

describe("passwordStrength", () => {
  it("scores from 0 to 4", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abcdefgh")).toBe(1);
    expect(passwordStrength("Abcdefg1")).toBe(3);
    expect(passwordStrength("Abcdefg1!")).toBe(4);
  });
});

describe("business email only (enquiry forms)", () => {
  it("accepts work addresses and rejects personal / disposable ones", () => {
    for (const ok of ["ops@execujet.com", "sales@jet-fuel.aero", "a@company.co.in", "a@gmail-partners.com"]) expect(isBusinessEmail(ok), ok).toBe(true);
    for (const bad of ["a@gmail.com", "A@Gmail.com", "a@yahoo.co.in", "a@hotmail.fr", "a@outlook.com", "a@icloud.com", "a@proton.me", "a@mailinator.com"]) expect(isBusinessEmail(bad), bad).toBe(false);
    const r = workEmail.safeParse("someone@gmail.com");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/work email/i);
  });

  it("is applied to every enquiry form, but not to sign-up or login", () => {
    const personal = "someone@gmail.com";
    const forms = [
      enquirySchema.safeParse({ providerSlug: "x", name: "Ann Lee", email: personal, service: "Fuel", message: "Need a fuel quote for Friday." }),
      contactSchema.safeParse({ name: "Ann Lee", email: personal, subject: "Sales", message: "We would like to list our FBO." }),
      advertiseSchema.safeParse({ name: "Ann Lee", email: personal, company: "Jet Fuel Inc", placement: "sidebar" }),
      demoRequestSchema.safeParse({ firstName: "Ann", lastName: "Lee", email: personal, company: "Jet Fuel Inc", interest: "Advertising" }),
      dataLicenceSchema.safeParse({ name: "Ann Lee", email: personal, company: "Jet Fuel Inc", datasets: ["airports"], useCase: "Enrich our trip planning tool." }),
    ];
    for (const r of forms) {
      expect(r.success).toBe(false);
      if (!r.success) expect(fieldErrors(r.error).email).toMatch(/work email/i);
    }
    expect(signupSchema.safeParse({ firstName: "Ann", lastName: "Lee", email: personal, password: "Flight123" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: personal, password: "x" }).success).toBe(true);
  });
});
