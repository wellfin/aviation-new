import { describe, expect, it } from "vitest";
import { classifySeverity, getNotams, mockNotams } from "./notams";
import { flightCategory, getMetar, getTaf, mockMetar } from "./weather";

describe("flightCategory", () => {
  it.each([
    [null, 10, "VFR"],
    [3500, 10, "VFR"],
    [2500, 10, "MVFR"],
    [5000, 4, "MVFR"],
    [800, 10, "IFR"],
    [5000, 2, "IFR"],
    [300, 10, "LIFR"],
    [5000, 0.5, "LIFR"],
  ] as const)("ceiling %s ft / vis %s SM → %s", (ceiling, vis, expected) => {
    expect(flightCategory(ceiling, vis)).toBe(expected);
  });
});

describe("mock weather provider", () => {
  it("is deterministic per airport and upper-cases the code", async () => {
    const a = await getMetar("egll");
    const b = mockMetar("EGLL", new Date());
    expect(a?.icao).toBe("EGLL");
    expect(a?.windDirDeg).toBe(b.windDirDeg);
    expect(a?.raw.startsWith("EGLL ")).toBe(true);
  });
  it("returns a TAF with ordered validity", async () => {
    const t = await getTaf("KJFK");
    expect(t).not.toBeNull();
    expect(new Date(t!.validTo).getTime()).toBeGreaterThan(new Date(t!.validFrom).getTime());
    expect(t!.periods.length).toBeGreaterThan(0);
  });
});

describe("NOTAM severity", () => {
  it("flags runway closures as critical", () => {
    expect(classifySeverity("RWY 09L/27R CLSD DUE TO MAINT")).toBe("critical");
  });
  it("flags obstacles and works as warnings", () => {
    expect(classifySeverity("OBST CRANE ERECTED 1.2NM E OF ARP")).toBe("warning");
  });
  it("defaults to info", () => {
    expect(classifySeverity("INCREASED BIRD ACTIVITY IN VICINITY OF AD")).toBe("info");
  });
  it("mock NOTAMs are tagged with the requested airport", async () => {
    const list = await getNotams("omdb");
    expect(list.every((n) => n.icao === "OMDB")).toBe(true);
    expect(mockNotams("OMDB").some((n) => n.severity === "critical")).toBe(true);
  });
});
