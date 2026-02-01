import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createAdminKey() {
  return randomBytes(24).toString("base64url");
}

export function hashAdminKey(adminKey: string) {
  return createHash("sha256").update(adminKey).digest("hex");
}

export function verifyAdminKey(adminKey: string, expectedHash: string) {
  const actual = Buffer.from(hashAdminKey(adminKey), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
