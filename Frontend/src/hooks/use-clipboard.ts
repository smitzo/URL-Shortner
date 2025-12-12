"use client";

import { useCallback, useRef, useState } from "react";

export function useClipboard() {
  const timeoutRef = useRef<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const copy = useCallback(async (value: string, successMessage = "Copied.") => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(value);
      setMessage(successMessage);
    } catch {
      setMessage("Copy failed. Select the value manually.");
    }

    timeoutRef.current = window.setTimeout(() => setMessage(null), 2500);
  }, []);

  return {
    copy,
    message
  };
}
