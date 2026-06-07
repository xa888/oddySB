import type { Trader, Position, Activity, Platform } from "../schema/types.js";

// ─── Tatum ───────────────────────────────────────────────────────────────────

export function normalizeTatumTrader(raw: Record<string, unknown>, rank: number): Trader {
  return {
    rank,
    handle: (raw.userName as string | null) ?? null,
    address: ((raw.proxyWallet as string) ?? "").toLowerCase(),
    platform: "polymarket",
    totalPos: 0,
    totalBuy: Number(raw.vol ?? 0),
    totalSell: 0,
    winRate: 0,
    realizedPnl: Number(raw.pnl ?? 0),
    pnlPct: 0,
    avgPct: 0,
    avgBuySize: 0,
    lastActive: 1,
    tags: raw.isVerified ? ["VERIFIED"] : [],
    traderScore: null,
    estimatedEdge: null,
  };
}

// ─── Synthesis ───────────────────────────────────────────────────────────────

export function normalizeSynthesisTrader(raw: Record<string, unknown>, rank: number): Trader {
  const profit = Number(raw.profit ?? raw.pnl ?? 0);
  const volume = Number(raw.volume ?? raw.vol ?? 0);
  return {
    rank,
    handle: (raw.username as string | null) ?? null,
    address: ((raw.address as string | null) ?? "").toLowerCase(),
    platform: "kalshi",
    totalPos: Number(raw.markets_traded ?? 0),
    totalBuy: volume,
    totalSell: 0,
    winRate: 0,
    realizedPnl: profit,
    pnlPct: volume > 0 ? (profit / volume) * 100 : 0,
    avgPct: 0,
    avgBuySize: 0,
    lastActive: 1,
    tags: [],
    traderScore: null,
    estimatedEdge: null,
  };
}

// ─── Predexon ────────────────────────────────────────────────────────────────

export function normalizePredexonTrader(raw: Record<string, unknown>, rank: number): Trader {
  const pnl = Number(raw.realized_pnl ?? raw.total_pnl ?? 0);
  const buy = Number(raw.total_buy ?? raw.total_volume ?? 0);
  return {
    rank,
    handle: (raw.handle as string | null) ?? (raw.username as string | null) ?? null,
    address: ((raw.address ?? raw.wallet) as string ?? "").toLowerCase(),
    platform: ((raw.platform as Platform) ?? "polymarket"),
    totalPos: Number(raw.total_positions ?? raw.trade_count ?? 0),
    totalBuy: buy,
    totalSell: Number(raw.total_sell ?? 0),
    winRate: Number(raw.win_rate ?? 0),
    realizedPnl: pnl,
    pnlPct: Number(raw.pnl_pct ?? (buy > 0 ? (pnl / buy) * 100 : 0)),
    avgPct: Number(raw.avg_pct ?? 0),
    avgBuySize: Number(raw.avg_buy_size ?? 0),
    lastActive: Number(raw.last_active_days ?? 1),
    tags: (raw.tags as string[] | null) ?? [],
    traderScore: null,
    estimatedEdge: null,
  };
}

// ─── Position ────────────────────────────────────────────────────────────────

export function normalizePosition(raw: Record<string, unknown>, venue: Platform): Position {
  const entry = Number(raw.entry_price ?? raw.price ?? 0);
  const current = raw.current_price != null ? Number(raw.current_price) : null;
  const exit = raw.exit_price != null ? Number(raw.exit_price) : null;
  const size = Number(raw.size ?? raw.amount ?? 0);
  const refPrice = current ?? exit ?? entry;
  const pnl = Number(raw.pnl ?? raw.realized_pnl ?? (size * (refPrice - entry)));

  return {
    id: String(raw.id ?? raw.condition_id ?? ""),
    title: String(raw.title ?? raw.question ?? raw.market_name ?? ""),
    market: String(raw.market_slug ?? raw.market_id ?? ""),
    eco: venue,
    side: (raw.side as "YES" | "NO" | "BUY" | "SELL") ?? "YES",
    size,
    entry,
    current,
    exit,
    pnl,
    pnlPct: Number(raw.pnl_pct ?? (entry > 0 ? ((refPrice - entry) / entry) * 100 : 0)),
    expiry: (raw.end_date as string | null) ?? (raw.expiry as string | null) ?? null,
    closedAt: (raw.closed_at as string | null) ?? (raw.resolved_at as string | null) ?? null,
    confidence: (raw.confidence as number | null) ?? null,
    won: (raw.won as boolean | null) ?? null,
  };
}

// ─── Activity ────────────────────────────────────────────────────────────────

export function normalizeActivity(raw: Record<string, unknown>, venue: Platform): Activity {
  const type = (raw.type as Activity["type"]) ?? (raw.side === "BUY" ? "BUY" : "SELL");
  const qty = Number(raw.quantity ?? raw.size ?? 0);
  const price = Number(raw.price ?? 0);

  return {
    type,
    tok: {
      name: String(raw.market_name ?? raw.question ?? ""),
      side: String(raw.outcome ?? raw.side ?? "YES"),
      market: venue,
      price,
    },
    peer: (raw.counterparty as string | null) ?? null,
    qty,
    price,
    value: Number(raw.value ?? raw.cost ?? qty * price),
    pnl: (raw.pnl as string | null) ?? null,
    pnlPct: (raw.pnl_pct as number | null) ?? null,
    pnlPos: raw.pnl != null ? Number(raw.pnl) >= 0 : null,
    minsAgo: Math.floor((Date.now() - Number(raw.timestamp ?? raw.created_at ?? Date.now())) / 60000),
    hash: String(raw.transaction_hash ?? raw.hash ?? ""),
  };
}

// ─── Merge enrichment into base trader ───────────────────────────────────────

export function mergeTraderProfiles(base: Trader, enrichments: Partial<Trader>[]): Trader {
  return enrichments.reduce<Trader>((acc, e) => ({ ...acc, ...e } as Trader), base);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
