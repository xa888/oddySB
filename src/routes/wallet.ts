import type { FastifyInstance } from "fastify";
import { cacheGetOrFetch } from "../cache/supabase.js";
import * as predexon from "../providers/predexon.js";
import * as synthesis from "../providers/synthesis.js";
import * as radion from "../providers/radion.js";
import { normalizePosition, normalizeActivity } from "../utils/normalizers.js";
import { ok, err } from "../schema/types.js";
import type { WalletProfile, FlowGraph, Position, Activity, Reward } from "../schema/types.js";

const TTL_PROFILE = 120;
const TTL_POSITIONS = 30;
const TTL_FLOW = 300;
const TTL_ACTIVITY = 30;
const TTL_REWARDS = 120;

export async function walletRoutes(app: FastifyInstance) {
  // GET /v1/wallet/:address
  app.get("/:address", async (req, reply) => {
    const { address } = req.params as { address: string };
    const cacheKey = `oddy:wallet:${address.toLowerCase()}:profile`;

    try {
      const profile = await cacheGetOrFetch<WalletProfile>(
        cacheKey,
        async () => {
          const [raw, radionScore] = await Promise.allSettled([
            predexon.getWalletProfile(address),
            radion.getTraderAnalysis(address),
          ]);

          const p = raw.status === "fulfilled" ? raw.value : {};
          const score = radionScore.status === "fulfilled" ? radionScore.value : null;

          return {
            handle: (p.handle as string | null) ?? (p.username as string | null) ?? null,
            address: address.toLowerCase(),
            eco: (p.platform as WalletProfile["eco"]) ?? "polymarket",
            winRate: Number(p.win_rate ?? p.winRate ?? 0),
            riskScore: Number(p.risk_score ?? p.riskScore ?? 50),
            volume: Number(p.total_volume ?? p.volume ?? 0),
            pnl: Number(p.realized_pnl ?? p.pnl ?? 0),
            pnlPct: Number(p.pnl_pct ?? p.pnlPct ?? 0),
            pnlTimeSeries: (p.pnl_over_time as WalletProfile["pnlTimeSeries"]) ?? [],
            tags: (p.tags as string[]) ?? [],
            platformBreakdown: (p.platform_breakdown as WalletProfile["platformBreakdown"]) ?? [],
            traderScore: score?.traderScore ?? null,
            estimatedEdge: score?.estimatedEdge ?? null,
          };
        },
        TTL_PROFILE,
      );

      return reply.send(ok(profile, TTL_PROFILE));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/wallet/:address/positions
  app.get("/:address/positions", async (req, reply) => {
    const { address } = req.params as { address: string };
    const {
      status = "open",
      platform = "polymarket",
      cursor,
      limit = "30",
    } = req.query as Record<string, string>;

    const cacheKey = `oddy:wallet:${address.toLowerCase()}:positions:${status}:${platform}`;

    try {
      const result = await cacheGetOrFetch<{ positions: Position[]; nextCursor: string | null }>(
        cacheKey,
        async () => {
          const { positions: raw, nextCursor } = await predexon.getPositions(address, {
            status: status as "open" | "closed",
            cursor,
            limit: Number(limit),
          });

          const positions = raw.map((r) =>
            normalizePosition(r as Record<string, unknown>, platform as Position["eco"]),
          );
          return { positions, nextCursor };
        },
        TTL_POSITIONS,
      );

      return reply.send(ok(result, TTL_POSITIONS));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/wallet/:address/flow
  app.get("/:address/flow", async (req, reply) => {
    const { address } = req.params as { address: string };
    const cacheKey = `oddy:wallet:${address.toLowerCase()}:flow`;

    try {
      const flow = await cacheGetOrFetch<FlowGraph>(
        cacheKey,
        async () => {
          const cluster = await predexon.getWalletCluster(address);

          type RawLinked = { address?: string; txs?: number; volume?: number; side?: string; pnl?: number; pct?: number };
          const rawLinked = (cluster.linked_wallets ?? cluster.wallets ?? []) as RawLinked[];

          const linked = rawLinked.map((w: RawLinked) => ({
            addr: String(w.address ?? ""),
            txs: Number(w.txs ?? 0),
            vol: Number(w.volume ?? 0),
            side: String(w.side ?? "BUY"),
            pnl: Number(w.pnl ?? 0),
            pct: Number(w.pct ?? 0),
          }));

          return {
            root: { addr: address.toLowerCase(), label: null },
            children: linked.slice(0, 3).map((l) => ({ ...l, children: [] })),
            linked,
            stats: {
              totalLinked: linked.length,
              winRate: Number(cluster.win_rate ?? 0),
              riskScore: Number(cluster.risk_score ?? 50),
            },
          };
        },
        TTL_FLOW,
      );

      return reply.send(ok(flow, TTL_FLOW));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/wallet/:address/activity
  app.get("/:address/activity", async (req, reply) => {
    const { address } = req.params as { address: string };
    const {
      type = "all",
      cursor,
      limit = "30",
    } = req.query as Record<string, string>;

    const cacheKey = `oddy:wallet:${address.toLowerCase()}:activity:${type}:${cursor ?? ""}`;

    try {
      const result = await cacheGetOrFetch<{ activity: Activity[]; nextCursor: string | null }>(
        cacheKey,
        async () => {
          const { trades: raw, nextCursor } = await predexon.getTrades(address, {
            cursor,
            limit: Number(limit),
          });

          let activity = raw.map((r) =>
            normalizeActivity(r as Record<string, unknown>, "polymarket"),
          );

          if (type !== "all") {
            activity = activity.filter((a) => a.type === type.toUpperCase());
          }

          return { activity, nextCursor };
        },
        TTL_ACTIVITY,
      );

      return reply.send(ok(result, TTL_ACTIVITY));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });

  // GET /v1/wallet/:address/rewards
  app.get("/:address/rewards", async (req, reply) => {
    const { address } = req.params as { address: string };
    const { type = "all" } = req.query as Record<string, string>;
    const cacheKey = `oddy:wallet:${address.toLowerCase()}:rewards:${type}`;

    try {
      const result = await cacheGetOrFetch<{
        rewards: Reward[];
        summary: { totalClaimed: number; pendingAmount: number; activeMarkets: number; rewardCount: number };
      }>(
        cacheKey,
        async () => {
          // V1: derive rewards from closed positions (maker fills = rebates)
          const { positions } = await predexon.getPositions(address, { status: "closed", limit: 50 });

          const rewards: Reward[] = (positions as Array<Record<string, unknown>>)
            .filter((p) => Number(p.pnl ?? 0) > 0)
            .slice(0, 20)
            .map((p) => ({
              type: "Maker rebate",
              market: String(p.market_name ?? p.title ?? ""),
              marketId: String(p.id ?? ""),
              eco: "polymarket" as const,
              amount: Number(p.pnl ?? 0) * 0.01,
              status: "CLAIMED" as const,
              time: String(p.closed_at ?? ""),
              txHash: String(p.transaction_hash ?? ""),
            }));

          const totalClaimed = rewards
            .filter((r) => r.status === "CLAIMED")
            .reduce((s, r) => s + r.amount, 0);
          const pendingAmount = rewards
            .filter((r) => r.status === "PENDING")
            .reduce((s, r) => s + r.amount, 0);

          return {
            rewards,
            summary: {
              totalClaimed,
              pendingAmount,
              activeMarkets: new Set(rewards.map((r) => r.marketId)).size,
              rewardCount: rewards.length,
            },
          };
        },
        TTL_REWARDS,
      );

      return reply.send(ok(result, TTL_REWARDS));
    } catch (e: unknown) {
      app.log.error(e);
      return reply.status(503).send(err("UPSTREAM_ERROR", (e as Error).message));
    }
  });
}
