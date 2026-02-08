export const reservedCodes = new Set([
  "api",
  "health",
  "ready",
  "docs",
  "admin",
  "assets",
  "static",
  "favicon.ico",
  "robots.txt"
]);

export function isReservedCode(code: string) {
  return reservedCodes.has(code.toLowerCase());
}
