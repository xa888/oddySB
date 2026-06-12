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

// ─── Polydata ────────────────────────────────────────────────────────────────

export function normalizePolydataTrader(raw: Record<string, unknown>, rank: number): Trader {
  const pnl = Number(raw.profit ?? raw.pnl ?? raw.realized_pnl ?? 0);
  const buy = Number(raw.volume ?? raw.total_volume ?? raw.buy_volume ?? 0);
  const sell = Number(raw.sell_volume ?? 0);
  const tradeCount = Number(raw.trade_count ?? raw.total_trades ?? raw.num_trades ?? 0);
  const winRate = Number(raw.win_rate ?? raw.wr ?? 0);
  const lastTs = raw.last_trade_ts ?? raw.last_active ?? null;
  const lastActiveDays = lastTs
    ? Math.max(1, Math.floor((Date.now() - Number(lastTs) * 1000) / 86_400_000))
    : 1;

  return {
    rank,
    handle: (raw.username as string | null) ?? (raw.handle as string | null) ?? null,
    address: String(raw.address ?? raw.trader_address ?? raw.wallet ?? "").toLowerCase(),
    platform: "polymarket",
    totalPos: tradeCount,
    totalBuy: buy,
    totalSell: sell,
    winRate,
    realizedPnl: pnl,
    pnlPct: buy > 0 ? (pnl / buy) * 100 : Number(raw.pnl_pct ?? 0),
    avgPct: Number(raw.avg_pct ?? raw.avg_profit_pct ?? 0),
    avgBuySize: tradeCount > 0 ? buy / tradeCount : 0,
    lastActive: lastActiveDays,
    tags: (raw.tags as string[] | null) ?? [],
    traderScore: (raw.trader_score as number | null) ?? null,
    estimatedEdge: (raw.estimated_edge as number | null) ?? null,
  };
}

export function normalizePolydataPosition(raw: Record<string, unknown>): import("../schema/types.js").Position {
  const entry = Number(raw.avg_price ?? raw.entry_price ?? 0);
  const current = raw.current_price != null ? Number(raw.current_price) : null;
  const exit = (raw.exit_price != null || raw.close_price != null)
    ? Number(raw.exit_price ?? raw.close_price)
    : null;
  const size = Number(raw.size ?? raw.amount ?? raw.shares ?? 0);
  const pnl = Number(raw.profit ?? raw.pnl ?? raw.realized_pnl ?? 0);

  return {
    id: String(raw.condition_id ?? raw.market_id ?? raw.id ?? ""),
    title: String(raw.question ?? raw.market_name ?? raw.title ?? ""),
    market: String(raw.market_slug ?? raw.slug ?? raw.condition_id ?? ""),
    eco: "polymarket",
    side: (raw.outcome as "YES" | "NO") ?? (raw.side as "BUY" | "SELL") ?? "YES",
    size,
    entry,
    current,
    exit,
    pnl,
    pnlPct: entry > 0 ? ((Number(current ?? exit ?? entry) - entry) / entry) * 100 : 0,
    expiry: (raw.end_date as string | null) ?? null,
    closedAt: (raw.close_time as string | null) ?? (raw.resolved_at as string | null) ?? null,
    confidence: null,
    won: (raw.won as boolean | null) ?? (raw.is_winner as boolean | null) ?? null,
  };
}

export function normalizePolydataTrade(raw: Record<string, unknown>): import("../schema/types.js").Activity {
  const side = String(raw.side ?? raw.outcome_bought ?? "BUY").toUpperCase();
  const price = Number(raw.price ?? raw.avg_price ?? 0);
  const qty = Number(raw.size ?? raw.shares ?? raw.amount ?? 0);
  const ts = raw.timestamp ?? raw.created_at ?? raw.trade_time;

  return {
    type: (side === "BUY" ? "BUY" : "SELL") as import("../schema/types.js").ActivityType,
    tok: {
      name: String(raw.question ?? raw.market_name ?? ""),
      side: String(raw.outcome ?? side),
      market: "polymarket",
      price,
    },
    peer: null,
    qty,
    price,
    value: Number(raw.value ?? raw.cost ?? qty * price),
    pnl: raw.profit != null ? String(Number(raw.profit) >= 0 ? "+" : "") + String(Number(raw.profit).toFixed(2)) : null,
    pnlPct: raw.profit != null && qty * price > 0 ? (Number(raw.profit) / (qty * price)) * 100 : null,
    pnlPos: raw.profit != null ? Number(raw.profit) >= 0 : null,
    minsAgo: ts ? Math.floor((Date.now() - Number(ts) * 1000) / 60_000) : 0,
    hash: String(raw.transaction_hash ?? raw.tx_hash ?? ""),
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
