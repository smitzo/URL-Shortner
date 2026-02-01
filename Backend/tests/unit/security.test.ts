import { describe, expect, it } from "vitest";
import {
  createAdminKey,
  hashAdminKey,
  verifyAdminKey
} from "@/modules/links/security.js";

describe("admin key helpers", () => {
  it("creates high entropy url-safe admin keys", () => {
    const adminKey = createAdminKey();

    expect(adminKey).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(adminKey.length).toBeGreaterThanOrEqual(32);
  });

  it("verifies admin keys using their sha256 hash", () => {
    const adminKey = "a-secure-admin-key-for-tests";
    const hash = hashAdminKey(adminKey);

    expect(hash).toHaveLength(64);
    expect(verifyAdminKey(adminKey, hash)).toBe(true);
    expect(verifyAdminKey("wrong-key", hash)).toBe(false);
  });
});
