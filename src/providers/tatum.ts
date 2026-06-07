import { fetch } from "undici";
import type { Trader } from "../schema/types.js";
import { normalizeTatumTrader } from "../utils/normalizers.js";

const BASE = "https://api.tatum.io/v4/data/prediction";
const KEY = process.env.TATUM_API_KEY ?? "";

type Category =
  | "OVERALL"
  | "POLITICS"
  | "SPORTS"
  | "CRYPTO"
  | "CULTURE"
  | "MENTIONS"
  | "WEATHER"
  | "ECONOMICS"
  | "TECH"
  | "FINANCE";

type TimePeriod = "DAY" | "WEEK" | "MONTH" | "ALL";
type OrderBy = "PNL" | "VOL";

export interface TopTradersParams {
  category?: Category;
  timePeriod?: TimePeriod;
  orderBy?: OrderBy;
  limit?: number;
  offset?: number;
  user?: string;
  userName?: string;
}

export async function getTopTraders(params: TopTradersParams = {}): Promise<Trader[]> {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.timePeriod) qs.set("timePeriod", params.timePeriod);
  if (params.orderBy) qs.set("orderBy", params.orderBy);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  if (params.user) qs.set("user", params.user);
  if (params.userName) qs.set("userName", params.userName);

  const url = `${BASE}/top-traders?${qs}`;
  const res = await fetch(url, {
    headers: { "x-api-key": KEY },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`Tatum ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as unknown[];
  return (Array.isArray(json) ? json : []).map(
    (r, i) => normalizeTatumTrader(r as Record<string, unknown>, i + 1),
  );
}
