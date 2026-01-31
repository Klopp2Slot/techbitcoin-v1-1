type CacheEntry<T> = { value: T; ts: number };

const store = new Map<string, CacheEntry<any>>();

export function getCache<T>(key: string): CacheEntry<T> | undefined {
  return store.get(key);
}

export function setCache<T>(key: string, value: T): void {
  store.set(key, { value, ts: Date.now() });
}
