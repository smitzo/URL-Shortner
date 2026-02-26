"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const keyPrefix = "shortner.admin-key.";

export function useAdminKey(code: string) {
  const searchParams = useSearchParams();
  const queryAdminKey = searchParams.get("adminKey") ?? "";
  const storageKey = useMemo(() => `${keyPrefix}${code}`, [code]);
  const [adminKey, setAdminKeyState] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey) ?? "";
    const next = queryAdminKey || saved;
    setAdminKeyState(next);

    if (queryAdminKey) {
      window.localStorage.setItem(storageKey, queryAdminKey);
    }
  }, [queryAdminKey, storageKey]);

  function setAdminKey(value: string) {
    setAdminKeyState(value);

    if (value) {
      window.localStorage.setItem(storageKey, value);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }

  return {
    adminKey,
    setAdminKey,
    hasAdminKey: adminKey.length >= 24
  };
}
