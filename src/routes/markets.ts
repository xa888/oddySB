import type { FastifyInstance } from "fastify";
import { cacheGetOrFetch } from "../cache/supabase.js";
import * as polydata from "../providers/polydata.js";
import { ok, err } from "../schema/types.js";

const TTL_WHALES    = 120;   // 2 min — fast-moving
const TTL_SCREENER  = 180;
const TTL_ORACLE    = 600;   // 10 min
const TTL_PMX       = 60;
const TTL_MARKET    = 120;
const TTL_EVENT     = 300;
const TTL_GROWTH    = 3600;  // 1 hour

export async function marketsRoutes(app: FastifyInstance) {
  // ── Whales ─────────────────────────────────────────────────────────────────

  // GET /v1/whales
  app.get("/whales", async (_req, reply) => {
    try {
      const data = await cacheGetOrFetch(
        "oddy:whales",
        () => polydata.getWhales(),
        TTL_WHALES,
      );
      return reply.send(ok(data, TTL_WHALES));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/whales/moves
  app.get("/whales/moves", async (_req, reply) => {
    try {
      const data = await cacheGetOrFetch(
        "oddy:whales:moves",
        () => polydata.getWhalesMoves(),
        TTL_WHALES,
      );
      return reply.send(ok(data, TTL_WHALES));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/whales/flow?market_id=
  app.get("/whales/flow", async (req, reply) => {
    const { market_id } = req.query as Record<string, string>;
    const cacheKey = `oddy:whales:flow:${market_id ?? "all"}`;
    try {
      const data = await cacheGetOrFetch(
        cacheKey,
        () => polydata.getWhalesFlow(market_id),
        TTL_WHALES,
      );
      return reply.send(ok(data, TTL_WHALES));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // ── Screener ───────────────────────────────────────────────────────────────

  // GET /v1/screener?<filter params>
  app.get("/screener", async (req, reply) => {
    const params = req.query as Record<string, string>;
    const cacheKey = `oddy:screener:${JSON.stringify(params)}`;
    try {
      const data = await cacheGetOrFetch(
        cacheKey,
        () => polydata.getScreener(params),
        TTL_SCREENER,
      );
      return reply.send(ok(data, TTL_SCREENER));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/screener/summary
  app.get("/screener/summary", async (_req, reply) => {
    try {
      const data = await cacheGetOrFetch(
        "oddy:screener:summary",
        () => polydata.getScreenerSummary(),
        TTL_SCREENER,
      );
      return reply.send(ok(data, TTL_SCREENER));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // ── Oracle / Accuracy ──────────────────────────────────────────────────────

  // GET /v1/oracle/leaderboard
  app.get("/oracle/leaderboard", async (_req, reply) => {
    try {
      const data = await cacheGetOrFetch(
        "oddy:oracle:leaderboard",
        () => polydata.getOracleLeaderboard(),
        TTL_ORACLE,
      );
      return reply.send(ok(data, TTL_ORACLE));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/oracle/trader/:address
  app.get("/oracle/trader/:address", async (req, reply) => {
    const { address } = req.params as { address: string };
    try {
      const data = await cacheGetOrFetch(
        `oddy:oracle:trader:${address.toLowerCase()}`,
        () => polydata.getOracleTrader(address),
        TTL_ORACLE,
      );
      return reply.send(ok(data, TTL_ORACLE));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // ── PMX Index ──────────────────────────────────────────────────────────────

  // GET /v1/pmx-index
  app.get("/pmx-index", async (_req, reply) => {
    try {
      const data = await cacheGetOrFetch(
        "oddy:pmx-index",
        () => polydata.getPmxIndex(),
        TTL_PMX,
      );
      return reply.send(ok(data, TTL_PMX));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/pmx-index/:name/history?interval=1h|6h|1d
  app.get("/pmx-index/:name/history", async (req, reply) => {
    const { name } = req.params as { name: string };
    const { interval = "1d" } = req.query as Record<string, string>;
    try {
      const data = await cacheGetOrFetch(
        `oddy:pmx-index:${name}:${interval}`,
        () => polydata.getPmxIndexHistory(name, interval as "1h" | "6h" | "1d"),
        TTL_PMX,
      );
      return reply.send(ok(data, TTL_PMX));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // ── Market Detail ──────────────────────────────────────────────────────────

  // GET /v1/market/:condition_id
  app.get("/market/:condition_id", async (req, reply) => {
    const { condition_id } = req.params as { condition_id: string };
    try {
      const data = await cacheGetOrFetch(
        `oddy:market:${condition_id}`,
        () => polydata.getMarketOverview(condition_id),
        TTL_MARKET,
      );
      return reply.send(ok(data, TTL_MARKET));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // ── Event ─────────────────────────────────────────────────────────────────

  // GET /v1/event/:event_id
  app.get("/event/:event_id", async (req, reply) => {
    const { event_id } = req.params as { event_id: string };
    try {
      const data = await cacheGetOrFetch(
        `oddy:event:${event_id}`,
        () => polydata.getEvent(event_id),
        TTL_EVENT,
      );
      return reply.send(ok(data, TTL_EVENT));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/event/:event_id/markets?limit=&offset=
  app.get("/event/:event_id/markets", async (req, reply) => {
    const { event_id } = req.params as { event_id: string };
    const { limit = "20", offset = "0" } = req.query as Record<string, string>;
    try {
      const data = await cacheGetOrFetch(
        `oddy:event:${event_id}:markets:${limit}:${offset}`,
        () => polydata.getEventMarkets(event_id, Number(limit), Number(offset)),
        TTL_EVENT,
      );
      return reply.send(ok(data, TTL_EVENT));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/event/:event_id/traders?limit=&offset=
  app.get("/event/:event_id/traders", async (req, reply) => {
    const { event_id } = req.params as { event_id: string };
    const { limit = "20", offset = "0" } = req.query as Record<string, string>;
    try {
      const data = await cacheGetOrFetch(
        `oddy:event:${event_id}:traders:${limit}:${offset}`,
        () => polydata.getEventTraders(event_id, Number(limit), Number(offset)),
        TTL_EVENT,
      );
      return reply.send(ok(data, TTL_EVENT));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // ── Platform Growth ────────────────────────────────────────────────────────

  // GET /v1/stats/growth
  app.get("/stats/growth", async (_req, reply) => {
    try {
      const data = await cacheGetOrFetch(
        "oddy:stats:growth",
        () => polydata.getPlatformGrowth(),
        TTL_GROWTH,
      );
      return reply.send(ok(data, TTL_GROWTH));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/stats/daily?days=
  app.get("/stats/daily", async (req, reply) => {
    const { days = "30" } = req.query as Record<string, string>;
    try {
      const data = await cacheGetOrFetch(
        `oddy:stats:daily:${days}`,
        () => polydata.getPlatformStatsDaily(Number(days)),
        TTL_GROWTH,
      );
      return reply.send(ok(data, TTL_GROWTH));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/stats/hourly
  app.get("/stats/hourly", async (_req, reply) => {
    try {
      const data = await cacheGetOrFetch(
        "oddy:stats:hourly",
        () => polydata.getPlatformStatsHourly(),
        TTL_PMX,
      );
      return reply.send(ok(data, TTL_PMX));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // ── Leaderboard Markets ────────────────────────────────────────────────────

  // GET /v1/leaderboard/markets?period=
  app.get("/leaderboard/markets", async (req, reply) => {
    const { period = "7d" } = req.query as Record<string, string>;
    const p = (["1d", "7d", "30d"].includes(period) ? period : "7d") as polydata.LeaderboardPeriod;
    try {
      const data = await cacheGetOrFetch(
        `oddy:lb:markets:${p}`,
        () => polydata.getLeaderboardMarkets(p),
        300,
      );
      return reply.send(ok(data, 300));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // ── Trader Compare ─────────────────────────────────────────────────────────

  // GET /v1/trader/compare?address=0x...&address=0x...
  app.get("/trader/compare", async (req, reply) => {
    const { address } = req.query as { address: string | string[] };
    const addresses = Array.isArray(address) ? address : [address].filter(Boolean);
    if (addresses.length < 2) {
      return reply.status(400).send(err("INVALID_PARAMS", "Provide at least 2 address params"));
    }
    try {
      const data = await cacheGetOrFetch(
        `oddy:trader:compare:${addresses.sort().join(",")}`,
        () => polydata.compareTraders(addresses),
        300,
      );
      return reply.send(ok(data, 300));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });
}
