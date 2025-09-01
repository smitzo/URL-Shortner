import { describe, expect, it } from "vitest";
import { analyticsQuerySchema } from "@/modules/links/link.schemas.js";

describe("link schemas", () => {
  it("defaults analytics recent click limit", () => {
    const value = analyticsQuerySchema.parse({});

    expect(value.limit).toBe(25);
  });

  it("bounds analytics recent click limit", () => {
    expect(analyticsQuerySchema.parse({ limit: "100" }).limit).toBe(100);
    expect(() => analyticsQuerySchema.parse({ limit: "101" })).toThrow();
    expect(() => analyticsQuerySchema.parse({ limit: "0" })).toThrow();
  });

  it("rejects inverted analytics date windows", () => {
    expect(() =>
      analyticsQuerySchema.parse({
        from: "2026-06-24T10:00:00.000Z",
        to: "2026-06-23T10:00:00.000Z"
      })
    ).toThrow("from date");
  });
});
