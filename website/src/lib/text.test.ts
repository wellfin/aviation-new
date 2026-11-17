import { describe, expect, it } from "vitest";
import { applyAutoCase, autoCaseFor, capitalizeWords, sentenceCase, titleCase } from "./text";

describe("text formatting", () => {
  it("capitalises names but keeps the rest as typed", () => {
    expect(capitalizeWords("cargo charter")).toBe("Cargo Charter");
    expect(capitalizeWords("  captain   david osei ")).toBe("Captain David Osei");
    expect(capitalizeWords("AeroHub FBO network")).toBe("AeroHub FBO Network");
    expect(capitalizeWords("air-side catering")).toBe("Air-Side Catering");
  });
  it("writes places in Title Case", () => {
    expect(titleCase("LUTON")).toBe("Luton");
    expect(titleCase("new delhi")).toBe("New Delhi");
  });
  it("starts descriptions with a capital letter", () => {
    expect(sentenceCase("full CAMO, crewing and management.")).toBe("Full CAMO, crewing and management.");
  });
  it("picks the rule from the field name", () => {
    expect(autoCaseFor("email", "email")).toBe("lower");
    expect(autoCaseFor("contact.email2", undefined)).toBe("lower");
    expect(autoCaseFor("cat-slug", "text")).toBe("lower");
    expect(autoCaseFor("services.3.name", undefined)).toBe("words");
    expect(autoCaseFor("cert-1-issuer", undefined)).toBe("words");
    expect(autoCaseFor("city", undefined)).toBe("place");
    expect(autoCaseFor("password", "password")).toBeNull();
    expect(autoCaseFor("website", "url")).toBeNull();
    expect(autoCaseFor("q", "search")).toBeNull();
    expect(autoCaseFor("icao", undefined)).toBeNull();
    expect(applyAutoCase(" Ops@ExecuJet.COM ", "lower")).toBe("ops@execujet.com");
  });
});
