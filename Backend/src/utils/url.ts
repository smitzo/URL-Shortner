const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPrivateHostname(hostname: string) {
  if (PRIVATE_HOSTS.has(hostname)) {
    return true;
  }

  if (/^10\./.test(hostname)) {
    return true;
  }

  if (/^192\.168\./.test(hostname)) {
    return true;
  }

  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) {
    return true;
  }

  if (/^169\.254\./.test(hostname)) {
    return true;
  }

  return false;
}

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

  if (isPrivateHostname(parsed.hostname)) {
    throw new Error("Localhost and private network URLs are not allowed");
  }

  return normalizeUrl(value);
}
