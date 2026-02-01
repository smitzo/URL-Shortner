import { describe, expect, it } from "vitest";
import { createShortCode } from "@/modules/links/code.js";

describe("short code generation", () => {
  it("creates compact url-safe codes", () => {
    const code = createShortCode();

    expect(code).toMatch(/^[0-9a-zA-Z]{8}$/);
  });

  it("generates unique values across a sample", () => {
    const codes = new Set(Array.from({ length: 250 }, () => createShortCode()));

    expect(codes.size).toBe(250);
  });
});
