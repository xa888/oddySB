import { fetch } from "undici";
import type { Trader } from "../schema/types.js";
import { normalizePredexonTrader } from "../utils/normalizers.js";

const BASE = "https://api.predexon.com";
const KEY = process.env.PREDEXON_API_KEY ?? "";

function headers() {
  return { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`${BASE}${path}${qs}`, {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 429) throw new Error("RATE_LIMITED");
  if (!res.ok) throw new Error(`Predexon ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Leaderboard (Dev/Pro tier required) ─────────────────────────────────────

export async function getLeaderboard(params: {
  metric?: string;
  time_window?: string;
  limit?: number;
  offset?: number;
}): Promise<Trader[]> {
  const p: Record<string, string> = {};
  if (params.metric) p.metric = params.metric;
  if (params.time_window) p.time_window = params.time_window;
  if (params.limit) p.limit = String(params.limit);
  if (params.offset) p.offset = String(params.offset);

  const data = await get<{ traders?: unknown[] }>(
    "/v2/polymarket/analytics/leaderboard",
    p,
  );
  const list = data.traders ?? (Array.isArray(data) ? (data as unknown[]) : []);
  return list.map((r, i) =>
    normalizePredexonTrader(r as Record<string, unknown>, i + 1),
  );
}

// ─── Wallet PnL ──────────────────────────────────────────────────────────────

export async function getWalletPnl(
  wallet: string,
  params: { granularity?: "day" | "week" | "month" | "year" | "all" } = {},
): Promise<Record<string, unknown>> {
  return get<Record<string, unknown>>(
    `/v2/polymarket/wallet/pnl/${encodeURIComponent(wallet)}`,
    params as Record<string, string>,
  );
}

// ─── Positions ───────────────────────────────────────────────────────────────

export async function getPositions(
  wallet: string,
  params: { status?: "open" | "closed"; cursor?: string; limit?: number } = {},
): Promise<{ positions: unknown[]; nextCursor: string | null }> {
  const p: Record<string, string> = { wallet };
  if (params.status) p.status = params.status;
  if (params.cursor) p.cursor = params.cursor;
  if (params.limit) p.limit = String(params.limit);

  const data = await get<{ positions?: unknown[]; next_cursor?: string }>(
    "/v2/polymarket/wallet/positions",
    p,
  );
  return {
    positions: data.positions ?? [],
    nextCursor: data.next_cursor ?? null,
  };
}

// ─── Trade history ───────────────────────────────────────────────────────────

export async function getTrades(
  wallet: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<{ trades: unknown[]; nextCursor: string | null }> {
  const p: Record<string, string> = { wallet };
  if (params.cursor) p.cursor = params.cursor;
  if (params.limit) p.limit = String(params.limit);

  const data = await get<{ trades?: unknown[]; next_cursor?: string }>(
    "/v2/polymarket/trading/trades",
    p,
  );
  return { trades: data.trades ?? [], nextCursor: data.next_cursor ?? null };
}

// ─── Wallet cluster (linked wallets) ─────────────────────────────────────────

export async function getWalletCluster(
  address: string,
): Promise<Record<string, unknown>> {
  return get<Record<string, unknown>>("/v2/polymarket/wallet/cluster", {
    address,
  });
}

// ─── Wallet profile ──────────────────────────────────────────────────────────

export async function getWalletProfile(
  address: string,
): Promise<Record<string, unknown>> {
  return get<Record<string, unknown>>("/v2/polymarket/wallet/wallet-profile", {
    address,
  });
}

// ─── Batch wallet profiles ───────────────────────────────────────────────────

export async function getWalletProfilesBatch(
  addresses: string[],
): Promise<unknown[]> {
  const res = await fetch(`${BASE}/v2/polymarket/wallet/wallet-profiles-batch`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ addresses }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Predexon batch ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as unknown[];
  return Array.isArray(data) ? data : [];
}

// ─── Smart money activity ─────────────────────────────────────────────────────

export async function getSmartActivity(
  params: { limit?: number; min_smart_wallets?: number } = {},
): Promise<unknown[]> {
  const p: Record<string, string> = {};
  if (params.limit) p.limit = String(params.limit);
  if (params.min_smart_wallets) p.min_smart_wallets = String(params.min_smart_wallets);

  const data = await get<{ markets?: unknown[] }>(
    "/v2/polymarket/smart-money/smart-activity",
    p,
  );
  return data.markets ?? (Array.isArray(data) ? (data as unknown[]) : []);
}

// ─── Cross-venue market search ────────────────────────────────────────────────

export async function searchMarkets(
  query: string,
  venues?: string[],
): Promise<unknown[]> {
  const p: Record<string, string> = { query };
  if (venues?.length) p.venues = venues.join(",");

  const data = await get<{ results?: unknown[] }>(
    "/v2/polymarket/matching/search",
    p,
  );
  return data.results ?? (Array.isArray(data) ? (data as unknown[]) : []);
}
