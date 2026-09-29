import { describe, expect, it } from "vitest";
import { mapFrequencies, pairRunways } from "./openaip";
import { parseFaaSearchDate } from "./notams";

describe("OpenAIP mapping", () => {
  it("pairs reciprocal runway ends and converts metres to feet", () => {
    const runways = pairRunways([
      { designator: "27R", trueHeading: 269, dimension: { length: { value: 3902, unit: 0 }, width: { value: 50, unit: 0 } }, surface: { mainComposite: 0 }, instrumentApproach: true },
      { designator: "09L", trueHeading: 89, dimension: { length: { value: 3902, unit: 0 }, width: { value: 50, unit: 0 } }, surface: { mainComposite: 0 }, instrumentApproach: true },
      { designator: "18", trueHeading: 180, dimension: { length: { value: 1000, unit: 1 } }, surface: { mainComposite: 2 } },
    ]);
    expect(runways).toHaveLength(2);
    expect(runways[0]).toMatchObject({ designator: "09L/27R", lengthFt: 12802, widthFt: 164, surface: "Asphalt", ils: "ILS" });
    expect(runways[1]).toMatchObject({ designator: "18", lengthFt: 1000, surface: "Grass" });
  });

  it("maps frequency types", () => {
    expect(mapFrequencies([{ value: "118.505", type: 14, name: "HEATHROW TOWER" }, { value: "128.075", type: 15 }, { value: "130.0", type: 99 }])).toEqual([
      { type: "TWR", description: "HEATHROW TOWER", mhz: "118.505" },
      { type: "ATIS", description: "", mhz: "128.075" },
      { type: "COM", description: "", mhz: "130.0" },
    ]);
  });
});

describe("FAA NOTAM search dates", () => {
  it("parses MM/DD/YYYY HHmm as UTC and ignores the EST suffix", () => {
    expect(parseFaaSearchDate("09/27/2026 1230")).toBe("2026-09-27T12:30:00.000Z");
    expect(parseFaaSearchDate("10/31/2026 2359EST")).toBe("2026-10-31T23:59:00.000Z");
  });
  it("treats PERM or blank as open-ended", () => {
    expect(parseFaaSearchDate("PERM")).toBeNull();
    expect(parseFaaSearchDate(undefined)).toBeNull();
  });
});

describe("NOTAM severity from live FAA wording", () => {
  it("does not flag taxiway lighting outages near a runway as critical", async () => {
    const { classifySeverity } = await import("./notams");
    expect(classifySeverity("TWY K LGT BTN RWY 13R/31L AND TWY A U/S")).toBe("warning");
    expect(classifySeverity("RWY 04L/22R CLSD")).toBe("critical");
    expect(classifySeverity("AD CLSD TO NON-SKED TRANSIENT GA ACFT")).toBe("critical");
  });
});
