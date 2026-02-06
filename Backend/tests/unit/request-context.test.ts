import { describe, expect, it } from "vitest";
import { hashIp } from "@/modules/links/request-context.js";

describe("request context helpers", () => {
  it("hashes ips without returning the raw address", () => {
    const hash = hashIp("203.0.113.10");

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("203.0.113.10");
  });

  it("returns undefined when no ip is available", () => {
    expect(hashIp(undefined)).toBeUndefined();
  });
});
