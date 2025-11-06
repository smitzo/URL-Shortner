"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AsyncState<TData> = {
  data: TData | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
};

export function useAsyncResource<TData>(
  enabled: boolean,
  load: () => Promise<TData>,
  dependencies: React.DependencyList
) {
  const requestId = useRef(0);
  const [state, setState] = useState<AsyncState<TData>>({
    data: null,
    error: null,
    loading: enabled,
    refreshing: false
  });

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;

    setState((current) => ({
      ...current,
      error: null,
      loading: current.data === null,
      refreshing: current.data !== null
    }));

    try {
      const data = await load();

      if (requestId.current === currentRequest) {
        setState({
          data,
          error: null,
          loading: false,
          refreshing: false
        });
      }
    } catch (error) {
      if (requestId.current === currentRequest) {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Unable to load data.",
          loading: false,
          refreshing: false
        }));
      }
    }
  }, [enabled, load]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refresh, ...dependencies]);

  return {
    ...state,
    refresh
  };
}
