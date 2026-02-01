import type { Link } from "@prisma/client";
import { env } from "@/config/env.js";

export function shortUrlFor(code: string) {
  return `${env.API_BASE_URL.replace(/\/$/, "")}/${code}`;
}

export function publicLink(link: Link) {
  return {
    id: link.id,
    code: link.code,
    shortUrl: shortUrlFor(link.code),
    targetUrl: link.targetUrl,
    title: link.title,
    description: link.description,
    tags: link.tags,
    status: link.status,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt
  };
}
