// ─── Unified schema types shared across all providers ────────────────────────

export type Platform =
  | "polymarket"
  | "kalshi"
  | "hyperliquid"
  | "limitless"
  | "predict"
  | "opinion";

export type Side = "YES" | "NO" | "BUY" | "SELL";
export type ActivityType = "BUY" | "SELL" | "RECEIVE" | "SEND";
export type RewardStatus = "CLAIMED" | "PENDING" | "FAILED";

export interface Trader {
  rank: number;
  handle: string | null;
  address: string;
  platform: Platform;
  totalPos: number;
  totalBuy: number;
  totalSell: number;
  winRate: number;
  realizedPnl: number;
  pnlPct: number;
  avgPct: number;
  avgBuySize: number;
  lastActive: number;
  tags: string[];
  traderScore: number | null;
  estimatedEdge: number | null;
}

export interface Position {
  id: string;
  title: string;
  market: string;
  eco: Platform;
  side: Side;
  size: number;
  entry: number;
  current: number | null;
  exit: number | null;
  pnl: number;
  pnlPct: number;
  expiry: string | null;
  closedAt: string | null;
  confidence: number | null;
  won: boolean | null;
}

export interface Activity {
  type: ActivityType;
  tok: { name: string; side: string; market: string; price: number };
  peer: string | null;
  qty: number;
  price: number;
  value: number;
  pnl: string | null;
  pnlPct: number | null;
  pnlPos: boolean | null;
  minsAgo: number;
  hash: string;
}

export interface Reward {
  type: string;
  market: string;
  marketId: string;
  eco: Platform;
  amount: number;
  status: RewardStatus;
  time: string;
  txHash: string;
}

export interface WalletProfile {
  handle: string | null;
  address: string;
  eco: Platform;
  winRate: number;
  riskScore: number;
  volume: number;
  pnl: number;
  pnlPct: number;
  pnlTimeSeries: Array<{ ts: number; realized: number; unrealized: number; total: number }>;
  tags: string[];
  platformBreakdown: Array<{ platform: Platform; pnl: number; vol: number }>;
  traderScore: number | null;
  estimatedEdge: number | null;
}

export interface FlowGraph {
  root: { addr: string; label: string | null };
  children: FlowNode[];
  linked: LinkedWallet[];
  stats: { totalLinked: number; winRate: number; riskScore: number };
}

export interface FlowNode {
  addr: string;
  txs: number;
  vol: number;
  side: string;
  pnl: number;
  pct: number;
  children: FlowNode[];
}

export interface LinkedWallet {
  addr: string;
  txs: number;
  vol: number;
  side: string;
  pnl: number;
  pct: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: { cachedAt: number; ttl: number };
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export function ok<T>(data: T, ttl: number): ApiResponse<T> {
  return { success: true, data, meta: { cachedAt: Date.now(), ttl } };
}

export function err(code: string, message: string): ApiError {
  return { success: false, error: { code, message } };
}
