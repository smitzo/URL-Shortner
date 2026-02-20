type CacheEntry<TValue> = {
  value: TValue;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export function clearCacheKey(key: string) {
  memoryCache.delete(key);
}

export function clearCachePrefix(prefix: string) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

export async function cachedRequest<TValue>(
  key: string,
  ttlMs: number,
  load: () => Promise<TValue>
) {
  const now = Date.now();
  const cached = memoryCache.get(key) as CacheEntry<TValue> | undefined;

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const existing = inFlight.get(key) as Promise<TValue> | undefined;

  if (existing) {
    return existing;
  }

  const request = load()
    .then((value) => {
      memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs
      });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}
