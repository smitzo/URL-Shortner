const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function normalizeUrl(value: string) {
  const parsed = new URL(value);
  parsed.hash = "";
  return parsed.toString();
}

export function assertPublicHttpUrl(value: string) {
  const parsed = new URL(value);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("URL must use http or https");
  }

  if (PRIVATE_HOSTS.has(parsed.hostname)) {
    throw new Error("Localhost and private loopback URLs are not allowed");
  }

  return normalizeUrl(value);
}
