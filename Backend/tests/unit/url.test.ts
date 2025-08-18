import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, normalizeUrl } from "@/utils/url.js";

describe("url utilities", () => {
  it("normalizes urls by dropping fragments", () => {
    expect(normalizeUrl("https://example.com/path?x=1#section")).toBe(
      "https://example.com/path?x=1"
    );
  });

  it("accepts public http and https urls", () => {
    expect(assertPublicHttpUrl("https://example.com")).toBe("https://example.com/");
    expect(assertPublicHttpUrl("http://example.com/docs")).toBe("http://example.com/docs");
  });

  it("rejects unsafe protocols and loopback hosts", () => {
    expect(() => assertPublicHttpUrl("javascript:alert(1)")).toThrow("http or https");
    expect(() => assertPublicHttpUrl("http://localhost:3000")).toThrow("Localhost");
  });
});
