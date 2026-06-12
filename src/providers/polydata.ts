import { fetch } from "undici";

const BASE = "https://dev-api.polydata.pro/api/v3";
const KEY = process.env.POLYDATA_API_KEY ?? "";

const HEADERS = { "X-API-Key": KEY, "Accept": "application/json" };
const TIMEOUT = 10_000;

async function get<T>(path: string, qs?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (qs) {
    for (const [k, v] of Object.entries(qs)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`Polydata ${res.status} ${path}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Trader ──────────────────────────────────────────────────────────────────

export async function getTraderStats(address: string) {
  return get<Record<string, unknown>>(`/trader/${address}/stats`);
}

export async function getTraderTrades(address: string, limit = 50) {
  return get<Record<string, unknown>>(`/trader/${address}/trades`, { limit });
}

export async function getTraderMarkets(address: string, limit = 50) {
  return get<Record<string, unknown>>(`/trader/${address}/markets`, { limit });
}

export async function getTraderDailyActivity(address: string, limit = 90) {
  return get<Record<string, unknown>>(`/trader/${address}/activity/daily`, { limit });
}

export async function compareTraders(addresses: string[]) {
  const url = new URL(`${BASE}/trader/compare`);
  for (const a of addresses) url.searchParams.append("address", a);
  const res = await fetch(url.toString(), {
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`Polydata ${res.status} /trader/compare`);
  return res.json() as Promise<Record<string, unknown>>;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export type LeaderboardPeriod = "1d" | "7d" | "30d";

export async function getLeaderboardTraders(period: LeaderboardPeriod = "30d") {
  return get<Record<string, unknown>>("/leaderboard/traders", { period });
}

export async function getLeaderboardMarkets(period: LeaderboardPeriod = "7d") {
  return get<Record<string, unknown>>("/leaderboard/markets", { period });
}

// ─── Market ──────────────────────────────────────────────────────────────────

export async function getMarketOverview(conditionId: string) {
  return get<Record<string, unknown>>(`/market/${conditionId}/overview`);
}

export async function searchMarkets(q: string) {
  return get<Record<string, unknown>>("/markets/search", { q });
}

// ─── Platform Stats ───────────────────────────────────────────────────────────

export async function getPlatformStats() {
  return get<Record<string, unknown>>("/stats");
}

export async function getPlatformStatsHourly() {
  return get<Record<string, unknown>>("/stats/hourly");
}

export async function getPlatformStatsDaily(days = 30) {
  return get<Record<string, unknown>>("/stats/daily", { days });
}

export async function getPlatformGrowth() {
  return get<Record<string, unknown>>("/stats/growth");
}

// ─── PMX Index ───────────────────────────────────────────────────────────────

export async function getPmxIndex() {
  return get<Record<string, unknown>>("/pmx-index");
}

export async function getPmxIndexHistory(name: string, interval: "1h" | "6h" | "1d" = "1d") {
  return get<Record<string, unknown>>(`/pmx-index/${name}/history`, { interval });
}

// ─── Oracle ──────────────────────────────────────────────────────────────────

export async function getOracleLeaderboard() {
  return get<Record<string, unknown>>("/oracle/leaderboard");
}

export async function getOracleTrader(address: string) {
  return get<Record<string, unknown>>(`/oracle/trader/${address}`);
}

// ─── Whales ──────────────────────────────────────────────────────────────────

export async function getWhales() {
  return get<Record<string, unknown>>("/whales");
}

export async function getWhalesMoves() {
  return get<Record<string, unknown>>("/whales/moves");
}

export async function getWhalesFlow(marketId?: string) {
  return get<Record<string, unknown>>("/whales/flow", marketId ? { market_id: marketId } : undefined);
}

// ─── Screener ────────────────────────────────────────────────────────────────

export async function getScreener(params?: Record<string, string | number>) {
  return get<Record<string, unknown>>("/screener", params as Record<string, string | number | undefined>);
}

export async function getScreenerSummary() {
  return get<Record<string, unknown>>("/screener/summary");
}

// ─── Event ───────────────────────────────────────────────────────────────────

export async function getEvent(eventId: string) {
  return get<Record<string, unknown>>(`/event/${eventId}`);
}

export async function getEventMarkets(eventId: string, limit = 20, offset = 0) {
  return get<Record<string, unknown>>(`/event/${eventId}/markets`, { limit, offset });
}

export async function getEventTraders(eventId: string, limit = 20, offset = 0) {
  return get<Record<string, unknown>>(`/event/${eventId}/traders`, { limit, offset });
}
