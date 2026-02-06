import type { Request } from "express";
import { UAParser } from "ua-parser-js";
import { createHash } from "node:crypto";
import { env } from "@/config/env.js";

function firstForwardedValue(value: string | undefined) {
  return value?.split(",")[0]?.trim();
}

export function getClientIp(req: Request) {
  const forwarded = firstForwardedValue(req.header("x-forwarded-for"));
  return forwarded || req.ip || req.socket.remoteAddress || undefined;
}

export function hashIp(ip: string | undefined) {
  if (!ip) {
    return undefined;
  }

  return createHash("sha256").update(`${env.IP_HASH_SALT}:${ip}`).digest("hex");
}

export function buildClickContext(req: Request) {
  const userAgent = req.header("user-agent") || undefined;
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    ipHash: hashIp(getClientIp(req)),
    userAgent,
    referer: req.header("referer") || undefined,
    browser: result.browser.name,
    os: result.os.name,
    device: result.device.type || "desktop"
  };
}
