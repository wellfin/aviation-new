import { describe, expect, it } from "vitest";
import { contactSchema, enquirySchema, fieldErrors, loginSchema, otpSchema, passwordStrength, resetPasswordSchema, signupSchema } from "./forms";

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
