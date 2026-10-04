import { describe, expect, it } from "vitest";
import { MODULES, defaultModulesForRole, formatModules, hasModule, parseModules } from "../auth/modules";

describe("modules", () => {
  it("lists the known modules in canonical order", () => {
    expect(MODULES).toEqual(["website", "assets"]);
  });

  it("parses CSV: trims, drops unknown, dedupes, keeps MODULES order", () => {
    expect(parseModules("assets")).toEqual(["assets"]);
    expect(parseModules(" assets , website ,bogus,assets")).toEqual(["website", "assets"]);
    expect(parseModules("Website")).toEqual([]);
  });

  it("returns [] for null/undefined/empty", () => {
    expect(parseModules(null)).toEqual([]);
    expect(parseModules(undefined)).toEqual([]);
    expect(parseModules("")).toEqual([]);
    expect(parseModules(" , ")).toEqual([]);
  });

  it("formats to a normalised CSV that round-trips", () => {
    expect(formatModules(["assets", "website", "assets"])).toBe("website,assets");
    expect(formatModules([])).toBe("");
    expect(parseModules(formatModules(["assets"]))).toEqual(["assets"]);
  });

  it("checks membership", () => {
    expect(hasModule(["assets"], "assets")).toBe(true);
    expect(hasModule(["assets"], "website")).toBe(false);
  });

  it("defaults by role", () => {
    expect(defaultModulesForRole("admin")).toEqual(["website", "assets"]);
    expect(defaultModulesForRole("viewer")).toEqual(["assets"]);
  });
});
