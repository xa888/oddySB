import { Queue, Worker } from "bullmq";
import * as tatum from "../providers/tatum.js";
import * as synthesis from "../providers/synthesis.js";
import { cacheSet } from "../cache/redis.js";

// Pass plain options so BullMQ uses its own bundled ioredis internally.
// Passing a Redis instance from our top-level ioredis causes a type
// conflict because bullmq vendors its own copy of ioredis.
function redisConnection() {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379", 10),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
  };
}

export const refreshQueue = new Queue("oddy:refresh", { connection: redisConnection() });

// ─── Schedule recurring refresh jobs ─────────────────────────────────────────

export function scheduleRefreshJobs() {
  refreshQueue.add("leaderboard:refresh", {}, { repeat: { every: 4 * 60 * 1000 } });
  refreshQueue.add("trending:refresh",    {}, { repeat: { every: 2 * 60 * 1000 } });
  refreshQueue.add("stats:refresh",       {}, { repeat: { every: 45 * 1000 } });
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export const refreshWorker = new Worker(
  "oddy:refresh",
  async (job) => {
    switch (job.name) {
      case "leaderboard:refresh": {
        const [poly, kalshi] = await Promise.allSettled([
          tatum.getTopTraders({ timePeriod: "MONTH", orderBy: "PNL", limit: 50 }),
          synthesis.getKalshiLeaderboard({ metric: "profit", limit: 50 }),
        ]);
        if (poly.status === "fulfilled") {
          await cacheSet("oddy:lb:trade:polymarket:30d:realizedPnl", poly.value, 300);
        }
        if (kalshi.status === "fulfilled") {
          await cacheSet("oddy:lb:trade:kalshi:30d:realizedPnl", kalshi.value, 300);
        }
        break;
      }

      case "trending:refresh": {
        const traders = await tatum.getTopTraders({ timePeriod: "DAY", orderBy: "PNL", limit: 8 });
        await cacheSet("oddy:trending", traders, 180);
        break;
      }

      case "stats:refresh": {
        // Stats are synthetic — no upstream call needed yet
        break;
      }
    }
  },
  { connection: redisConnection() },
);
