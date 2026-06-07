import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const DEFAULT_TTL = Number(process.env.CACHE_DEFAULT_TTL_S ?? 60);

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    client.on("error", (err: Error) => {
      console.error("[redis] connection error:", err.message);
    });
  }
  return client;
}

export async function cacheGet<T>(key: string): Promise<{ data: T; age: number } | null> {
  try {
    const raw = await getRedis().get(key);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw) as { data: T; cachedAt: number };
    return { data, age: Math.floor((Date.now() - cachedAt) / 1000) };
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    await getRedis().set(key, JSON.stringify({ data, cachedAt: Date.now() }), "EX", ttl);
  } catch (err: unknown) {
    console.error("[redis] set error:", (err as Error).message);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch {
    // ignore
  }
}

// Stale-while-revalidate: return cached data immediately, trigger refresh if age > 80% of TTL.
export async function cacheGetOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
  onStale?: (fresh: Promise<T>) => void,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached) {
    if (cached.age > ttl * 0.8 && onStale) {
      onStale(
        fetcher().then(async (data) => {
          await cacheSet(key, data, ttl);
          return data;
        }),
      );
    }
    return cached.data;
  }
  const data = await fetcher();
  await cacheSet(key, data, ttl);
  return data;
}
