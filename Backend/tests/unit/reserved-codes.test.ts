import { describe, expect, it } from "vitest";
import { isReservedCode } from "@/modules/links/reserved-codes.js";

describe("reserved short codes", () => {
  it("protects backend route namespaces", () => {
    expect(isReservedCode("api")).toBe(true);
    expect(isReservedCode("health")).toBe(true);
    expect(isReservedCode("ready")).toBe(true);
  });

  it("checks reserved values case-insensitively", () => {
    expect(isReservedCode("API")).toBe(true);
  });

  it("allows normal user-facing codes", () => {
    expect(isReservedCode("launch2026")).toBe(false);
  });
});
