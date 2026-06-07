import { fetch } from "undici";
import type { Trader } from "../schema/types.js";
import { normalizeSynthesisTrader } from "../utils/normalizers.js";

const BASE = "https://api.synthesis.trade";
const KEY = process.env.SYNTHESIS_API_KEY ?? "";

function headers() {
  return { "X-PROJECT-API-KEY": KEY, "Content-Type": "application/json" };
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`${BASE}${path}${qs}`, {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Synthesis ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Kalshi leaderboard (no auth required) ───────────────────────────────────

export interface KalshiLeaderboardParams {
  metric?: "volume" | "profit";
  limit?: number;
  since?: number;
}

export async function getKalshiLeaderboard(
  params: KalshiLeaderboardParams = {},
): Promise<Trader[]> {
  const p: Record<string, string> = {};
  if (params.metric) p.metric = params.metric;
  if (params.limit) p.limit = String(params.limit);
  if (params.since) p.since = String(params.since);

  const data = await get<{ leaders?: unknown[] }>("/api/v1/kalshi/leaderboard", p);
  const list = data.leaders ?? (Array.isArray(data) ? (data as unknown[]) : []);
  return list.map((r, i) =>
    normalizeSynthesisTrader(r as Record<string, unknown>, i + 1),
  );
}

// ─── Kalshi user profile (no auth required) ──────────────────────────────────

export async function getKalshiUser(username: string): Promise<Record<string, unknown>> {
  return get<Record<string, unknown>>(`/api/v1/kalshi/user/${encodeURIComponent(username)}`);
}

// ─── Wallet PnL (requires account auth — V1: use project key) ────────────────

export type Interval = "1d" | "1w" | "1m" | "3m" | "1y" | "all";
export type Venue = "pol" | "sol";

export async function getWalletPnl(
  venue: Venue,
  walletId: string,
  interval: Interval = "1m",
): Promise<Array<{ ts: number; realized: number; unrealized: number; total: number }>> {
  const data = await get<{ pnl?: unknown[] }>(
    `/api/v1/wallet/${venue}/${encodeURIComponent(walletId)}/pnl`,
    { interval },
  );
  return (data.pnl ?? []) as Array<{
    ts: number;
    realized: number;
    unrealized: number;
    total: number;
  }>;
}

export async function getWalletPositions(
  venue: Venue,
  walletId: string,
): Promise<unknown[]> {
  const data = await get<{ positions?: unknown[] }>(
    `/api/v1/wallet/${venue}/${encodeURIComponent(walletId)}/positions`,
  );
  return data.positions ?? (Array.isArray(data) ? (data as unknown[]) : []);
}

export async function getWalletTrades(
  venue: Venue,
  walletId: string,
): Promise<unknown[]> {
  const path =
    venue === "pol"
      ? `/api/v1/wallet/pol/${encodeURIComponent(walletId)}/trades`
      : `/api/v1/wallet/sol/${encodeURIComponent(walletId)}/orders`;
  const data = await get<{ trades?: unknown[]; orders?: unknown[] }>(path);
  return data.trades ?? data.orders ?? (Array.isArray(data) ? (data as unknown[]) : []);
}
