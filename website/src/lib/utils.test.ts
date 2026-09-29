import { describe, expect, it } from "vitest";
import { bearingDeg, firstParam, flagEmoji, haversineKm, paginate, slugify, timeAgo, toInt } from "./utils";

describe("haversineKm", () => {
  it("computes LHR → JFK great-circle distance", () => {
    const d = haversineKm(51.4706, -0.461941, 40.6398, -73.7789);
    expect(d).toBeGreaterThan(5530);
    expect(d).toBeLessThan(5560);
  });

  it("is zero for identical points", () => {
    expect(haversineKm(10, 10, 10, 10)).toBe(0);
  });
});

describe("bearingDeg", () => {
  it("returns ~90° due east along the equator", () => {
    expect(bearingDeg(0, 0, 0, 10)).toBeCloseTo(90, 5);
  });
  it("stays within [0, 360)", () => {
    const b = bearingDeg(51.47, -0.46, 40.64, -73.78);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 23 }, (_, i) => i);
  it("slices the requested page", () => {
    const r = paginate(items, 2, 10);
    expect(r.items).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(r.totalPages).toBe(3);
  });
  it("clamps out-of-range pages", () => {
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate(items, -4, 10).page).toBe(1);
  });
  it("handles empty lists", () => {
    const r = paginate([], 1, 10);
    expect(r.items).toEqual([]);
    expect(r.totalPages).toBe(1);
  });
});

describe("params helpers", () => {
  it("toInt falls back on invalid input", () => {
    expect(toInt("3", 1)).toBe(3);
    expect(toInt("abc", 1)).toBe(1);
    expect(toInt("-2", 1)).toBe(1);
    expect(toInt(undefined, 5)).toBe(5);
    expect(toInt(["7", "8"], 1)).toBe(7);
  });
  it("firstParam unwraps arrays", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam("x")).toBe("x");
    expect(firstParam(undefined)).toBeUndefined();
  });
});

describe("formatting", () => {
  it("flagEmoji converts ISO codes and rejects junk", () => {
    expect(flagEmoji("gb")).toBe("🇬🇧");
    expect(flagEmoji("GBR")).toBe("");
  });
  it("slugify normalises names", () => {
    expect(slugify("Hunt & Palmer Ltd.")).toBe("hunt-palmer-ltd");
  });
  it("timeAgo picks sensible units", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    expect(timeAgo("2026-09-24T10:00:00Z", now)).toBe("2h ago");
    expect(timeAgo("2026-09-21T12:00:00Z", now)).toBe("3d ago");
  });
});
