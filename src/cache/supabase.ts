import { Pool } from "pg";

const DEFAULT_TTL = Number(process.env.CACHE_DEFAULT_TTL_S ?? 60);

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,                      // keep tiny for serverless
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on("error", (err) => {
      console.error("[supabase-cache] pool error:", err.message);
      pool = null;
    });
  }
  return pool;
}

export async function testConnection(): Promise<void> {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL not set");
  await p.query("SELECT 1");
}

export async function cacheGet<T>(key: string): Promise<{ data: T; age: number } | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const { rows } = await p.query<{ value: T; cached_at: string }>(
      "SELECT value, cached_at FROM oddy_cache WHERE key = $1 AND expires_at > NOW()",
      [key],
    );
    if (!rows.length) return null;
    return {
      data: rows[0].value,
      age: Math.floor((Date.now() - new Date(rows[0].cached_at).getTime()) / 1000),
    };
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO oddy_cache (key, value, cached_at, expires_at)
       VALUES ($1, $2::jsonb, NOW(), NOW() + ($3 || ' seconds')::INTERVAL)
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             cached_at = NOW(),
             expires_at = EXCLUDED.expires_at`,
      [key, JSON.stringify(data), ttl],
    );
  } catch (err) {
    console.error("[supabase-cache] set error:", (err as Error).message);
  }
}

export async function cacheDel(key: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query("DELETE FROM oddy_cache WHERE key = $1", [key]);
  } catch {
    // ignore
  }
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
