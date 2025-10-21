"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreatedLink } from "@/types/api";

const storageKey = "shortner.recent-links.v1";
const maxRecentLinks = 8;

function readRecentLinks() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as CreatedLink[]) : [];
  } catch {
    return [];
  }
}

function writeRecentLinks(links: CreatedLink[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(links));
}

export function useRecentLinks() {
  const [links, setLinks] = useState<CreatedLink[]>([]);

  useEffect(() => {
    setLinks(readRecentLinks());
  }, []);

  const addLink = useCallback((link: CreatedLink) => {
    setLinks((current) => {
      const next = [link, ...current.filter((item) => item.code !== link.code)].slice(
        0,
        maxRecentLinks
      );
      writeRecentLinks(next);
      return next;
    });
  }, []);

  const clearLinks = useCallback(() => {
    setLinks([]);
    window.localStorage.removeItem(storageKey);
  }, []);

  return {
    links,
    addLink,
    clearLinks
  };
}
