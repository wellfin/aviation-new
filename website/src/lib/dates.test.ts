import { describe, expect, it } from "vitest";
import { demoRequestSchema, fieldErrors } from "@/lib/api/forms";
import { isTodayOrLater, todayIso } from "./dates";

describe("dates", () => {
  const now = new Date(2026, 9, 1, 14, 30); // 1 Oct 2026, local time

  it("formats today in local time as YYYY-MM-DD", () => {
    expect(todayIso(now)).toBe("2026-10-01");
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("accepts today and later days, rejects earlier days and junk", () => {
    expect(isTodayOrLater("2026-10-01", now)).toBe(true);
    expect(isTodayOrLater("2026-10-02", now)).toBe(true);
    expect(isTodayOrLater("2027-01-01", now)).toBe(true);
    expect(isTodayOrLater("2026-09-30", now)).toBe(false);
    expect(isTodayOrLater("2025-12-31", now)).toBe(false);
    expect(isTodayOrLater("soon", now)).toBe(false);
  });

  it("the demo form rejects a past preferred date but allows a blank one", () => {
    const base = { firstName: "Ann", lastName: "Lee", email: "ann@jetfuel.aero", company: "Jet Fuel Inc", interest: "Advertising" };
    const past = demoRequestSchema.safeParse({ ...base, preferredDate: "2020-01-01" });
    expect(past.success).toBe(false);
    if (!past.success) expect(fieldErrors(past.error).preferredDate).toMatch(/today or a later date/i);
    expect(demoRequestSchema.safeParse({ ...base, preferredDate: "" }).success).toBe(true);
    expect(demoRequestSchema.safeParse({ ...base, preferredDate: todayIso() }).success).toBe(true);
  });
});
