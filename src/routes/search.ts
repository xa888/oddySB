import type { FastifyInstance } from "fastify";
import { cacheGetOrFetch } from "../cache/redis.js";
import * as predexon from "../providers/predexon.js";
import * as synthesis from "../providers/synthesis.js";
import * as tatum from "../providers/tatum.js";
import { ok, err } from "../schema/types.js";

const TTL_SEARCH = 600;
const TTL_MARKETS = 300;

function isAddress(q: string) {
  return /^0x[0-9a-fA-F]{10,}$/.test(q);
}

function isEns(q: string) {
  return q.endsWith(".eth");
}

export async function searchRoutes(app: FastifyInstance) {
  // GET /v1/search
  app.get("/search", async (req, reply) => {
    const { q = "" } = req.query as Record<string, string>;
    if (!q.trim()) {
      return reply.status(400).send(err("MISSING_QUERY", "q is required"));
    }

    const cacheKey = `oddy:search:${Buffer.from(q.toLowerCase()).toString("base64")}`;

    try {
      const result = await cacheGetOrFetch(
        cacheKey,
        async () => {
          if (isAddress(q)) {
            const profile = await predexon.getWalletProfile(q);
            return { type: "wallet", data: profile };
          }

          if (isEns(q)) {
            const profile = await predexon.getWalletProfile(q);
            return { type: "wallet_ens", data: profile };
          }

          // Username — try Synthesis Kalshi first
          try {
            const user = await synthesis.getKalshiUser(q);
            return { type: "kalshi_user", data: user };
          } catch {
            // fall through to Tatum
          }

          const traders = await tatum.getTopTraders({ userName: q, limit: 5 });
          return { type: "traders", data: traders };
        },
        TTL_SEARCH,
      );

      return reply.send(ok(result, TTL_SEARCH));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(404).send(err("NOT_FOUND", "No results found"));
    }
  });

  // GET /v1/markets/smart
  app.get("/markets/smart", async (_req, reply) => {
    try {
      const markets = await cacheGetOrFetch(
        "oddy:markets:smart",
        () => predexon.getSmartActivity({ limit: 20, min_smart_wallets: 2 }),
        TTL_MARKETS,
      );
      return reply.send(ok(markets, TTL_MARKETS));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/markets/search
  app.get("/markets/search", async (req, reply) => {
    const { q = "", venues } = req.query as Record<string, string>;
    if (!q.trim()) {
      return reply.status(400).send(err("MISSING_QUERY", "q is required"));
    }

    try {
      const venueList = venues ? venues.split(",") : undefined;
      const results = await cacheGetOrFetch(
        `oddy:markets:search:${Buffer.from(q).toString("base64")}`,
        () => predexon.searchMarkets(q, venueList),
        120,
      );
      return reply.send(ok(results, 120));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });
}
