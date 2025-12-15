"use client";

import { useCallback, useRef, useState } from "react";

export function useMutationQueue() {
  const queue = useRef(Promise.resolve());
  const pendingCount = useRef(0);
  const [pending, setPending] = useState(false);

  const enqueue = useCallback(async <TResult,>(task: () => Promise<TResult>) => {
    pendingCount.current += 1;
    setPending(true);

    const run = queue.current.then(task, task);
    queue.current = run.then(
      () => undefined,
      () => undefined
    );

    try {
      return await run;
    } finally {
      pendingCount.current -= 1;

      if (pendingCount.current === 0) {
        setPending(false);
      }
    }
  }, []);

  return {
    enqueue,
    pending
  };
}
