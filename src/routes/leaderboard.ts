import type { FastifyInstance } from "fastify";
import { cacheGetOrFetch } from "../cache/supabase.js";
import * as tatum from "../providers/tatum.js";
import * as synthesis from "../providers/synthesis.js";
import * as predexon from "../providers/predexon.js";
import { ok, err } from "../schema/types.js";
import type { Trader } from "../schema/types.js";

const TTL_TRADE = 300;    // 5 minutes
const TTL_REWARDS = 600;  // 10 minutes

function tatumPeriod(period: string): tatum.TopTradersParams["timePeriod"] {
  const map: Record<string, tatum.TopTradersParams["timePeriod"]> = {
    "1d": "DAY", "7d": "WEEK", "30d": "MONTH", "90d": "MONTH",
    "180d": "MONTH", "365d": "ALL", "all": "ALL",
  };
  return map[period] ?? "MONTH";
}

export async function leaderboardRoutes(app: FastifyInstance) {
  // GET /v1/leaderboard/trade
  app.get("/trade", async (req, reply) => {
    const {
      platform = "polymarket",
      period = "30d",
      orderBy = "realizedPnl",
      limit = "50",
      offset = "0",
    } = req.query as Record<string, string>;

    const cacheKey = `oddy:lb:trade:${platform}:${period}:${orderBy}`;

    try {
      const traders = await cacheGetOrFetch<Trader[]>(
        cacheKey,
        async () => {
          if (platform === "kalshi") {
            return synthesis.getKalshiLeaderboard({
              metric: orderBy === "volume" ? "volume" : "profit",
              limit: Number(limit),
            });
          }

          if (platform === "polymarket") {
            try {
              return tatum.getTopTraders({
                timePeriod: tatumPeriod(period),
                orderBy: orderBy === "volume" ? "VOL" : "PNL",
                limit: Math.min(Number(limit), 50),
                offset: Number(offset),
              });
            } catch {
              return predexon.getLeaderboard({
                time_window: period,
                limit: Number(limit),
                offset: Number(offset),
              });
            }
          }

          return predexon.getLeaderboard({
            time_window: period,
            limit: Number(limit),
            offset: Number(offset),
          });
        },
        TTL_TRADE,
      );

      const lim = Number(limit);
      const off = Number(offset);
      const page = traders.slice(off, off + lim).map((t, i) => ({
        ...t,
        rank: off + i + 1,
      }));

      return reply.send(ok({ traders: page, total: traders.length }, TTL_TRADE));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/leaderboard/rewards
  app.get("/rewards", async (req, reply) => {
    const { platform = "all", limit = "20" } = req.query as Record<string, string>;
    const cacheKey = `oddy:lb:rewards:${platform}`;

    try {
      const traders = await cacheGetOrFetch<Trader[]>(
        cacheKey,
        () =>
          synthesis.getKalshiLeaderboard({ metric: "profit", limit: Number(limit) }),
        TTL_REWARDS,
      );

      return reply.send(ok({ traders, total: traders.length }, TTL_REWARDS));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/leaderboard/stats
  app.get("/stats", async (req, reply) => {
    const { platform = "polymarket", period = "30d" } = req.query as Record<string, string>;
    const cacheKey = `oddy:lb:trade:${platform}:${period}:realizedPnl`;

    const cached = await cacheGetOrFetch<Trader[]>(
      cacheKey,
      async () => [],
      TTL_TRADE,
    );

    const totalVolume = cached.reduce((s, t) => s + t.totalBuy + t.totalSell, 0);
    const avgWinRate = cached.length
      ? Math.round(cached.reduce((s, t) => s + t.winRate, 0) / cached.length)
      : 0;
    const topPnl = cached[0]?.realizedPnl ?? 0;

    return reply.send(
      ok(
        { totalVolume, avgWinRate, topPnl, traderCount: cached.length },
        TTL_TRADE,
      ),
    );
  });
}
