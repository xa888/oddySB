import type { FastifyInstance } from "fastify";
import { cacheGetOrFetch } from "../cache/supabase.js";
import * as tatum from "../providers/tatum.js";
import { ok, err } from "../schema/types.js";

const TTL_STATS = 60;
const TTL_TRENDING = 180;
const TTL_ECOSYSTEMS = 600;

export async function statsRoutes(app: FastifyInstance) {
  // GET /v1/stats
  app.get("/stats", async (_req, reply) => {
    try {
      const data = await cacheGetOrFetch(
        "oddy:stats:global",
        async () => ({
          openInterest: 4_800_000_000,
          volume24h: 284_000_000,
          liveTraders: 89_400,
          activeMarkets: 142_000,
          trackedWallets: 12_400,
          alerts24h: 3_892,
        }),
        TTL_STATS,
      );
      return reply.send(ok(data, TTL_STATS));
    } catch (e: unknown) {
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/trending
  app.get("/trending", async (_req, reply) => {
    try {
      const traders = await cacheGetOrFetch(
        "oddy:trending",
        () =>
          tatum.getTopTraders({
            timePeriod: "DAY",
            orderBy: "PNL",
            limit: 8,
          }),
        TTL_TRENDING,
      );
      return reply.send(ok(traders, TTL_TRENDING));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/ecosystems
  app.get("/ecosystems", async (_req, reply) => {
    const data = await cacheGetOrFetch(
      "oddy:ecosystems",
      async () => [
        { id: "polymarket",  label: "Polymarket",  color: "#c9983a", chain: "Polygon",   tvl: 2_100_000_000, vol24h: 180_000_000 },
        { id: "kalshi",      label: "Kalshi",      color: "#c45c87", chain: "Regulated", tvl:   890_000_000, vol24h:  60_000_000 },
        { id: "hyperliquid", label: "Hyperliquid", color: "#3dba7a", chain: "HyperEVM",  tvl: 3_400_000_000, vol24h: 220_000_000 },
        { id: "limitless",   label: "Limitless",   color: "#527cd9", chain: "Base",      tvl:    44_000_000, vol24h:   3_000_000 },
        { id: "predict",     label: "Predict",     color: "#3dba7a", chain: "BNB",       tvl:    88_000_000, vol24h:   5_000_000 },
        { id: "opinion",     label: "Opinion",     color: "#8a6ed4", chain: "Solana",    tvl:    31_000_000, vol24h:   2_000_000 },
      ],
      TTL_ECOSYSTEMS,
    );
    return reply.send(ok(data, TTL_ECOSYSTEMS));
  });
}
