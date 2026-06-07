import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL; // undefined = no Redis, skip entirely
const DEFAULT_TTL = Number(process.env.CACHE_DEFAULT_TTL_S ?? 60);

let client: Redis | null = null;
let dead = false; // once a connection permanently fails, stop retrying

function getClient(): Redis | null {
  if (!REDIS_URL || dead) return null;
  if (client) return client;

  client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 0, // fail fast — don't retry in serverless
    enableOfflineQueue: false,
    connectTimeout: 2000,
    lazyConnect: true,
  });

  client.on("error", (err: Error) => {
    console.error("[redis] connection error:", err.message);
    dead = true;
    client = null;
  });

  return client;
}

export async function cacheGet<T>(key: string): Promise<{ data: T; age: number } | null> {
  const redis = getClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw) as { data: T; cachedAt: number };
    return { data, age: Math.floor((Date.now() - cachedAt) / 1000) };
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify({ data, cachedAt: Date.now() }), "EX", ttl);
  } catch (err: unknown) {
    console.error("[redis] set error:", (err as Error).message);
  }
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // ignore
  }
}

export function getRedis(): Redis {
  const r = getClient();
  if (!r) throw new Error("Redis is not configured (REDIS_URL not set)");
  return r;
}

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
