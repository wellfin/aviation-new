import { describe, expect, it } from "vitest";
import states from "@/lib/geo/states.json";
import { stateKey } from "./filters";

describe("stateKey", () => {
  it("drops the subdivision type word so official names match postal addresses", () => {
    expect(stateKey("Abu Dhabi Emirate")).toBe("abu dhabi");
    expect(stateKey("Luxembourg District")).toBe("luxembourg");
    expect(stateKey("Canton of Luxembourg")).toBe("luxembourg");
    expect(stateKey("Maharashtra")).toBe("maharashtra");
    expect(stateKey("New York")).toBe("new york");
  });

  it("never returns an empty key", () => {
    expect(stateKey("State")).toBe("state");
  });
});

describe("states.json (State dropdown data)", () => {
  const data = states as Record<string, string[]>;

  it("lists states per ISO country code, sorted", () => {
    expect(data.IN).toContain("Maharashtra");
    expect(data.US).toContain("California");
    expect(data.AE).toContain("Dubai");
    expect(Object.keys(data).every((c) => /^[A-Z]{2}$/.test(c))).toBe(true);
    expect(data.IN).toEqual([...data.IN!].sort((a, b) => a.localeCompare(b, "en")));
  });
});
