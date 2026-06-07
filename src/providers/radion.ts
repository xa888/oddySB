import { fetch } from "undici";

const BASE = "https://api.radion.app";
const KEY = process.env.RADION_API_KEY ?? "";

export interface TraderAnalysis {
  address: string;
  traderScore: number;
  traderConfidenceScore: number;
  estimatedEdge: number;
  winRate: number;
  profitLoss: number;
  effectivePositionRatio: number;
}

// ─── Stub: activate when Radion service is back online ───────────────────────

export async function listTraderAnalyses(params: {
  cursor?: string;
  limit?: number;
} = {}): Promise<{ analyses: TraderAnalysis[]; nextCursor: string | null }> {
  if (!KEY) {
    return { analyses: [], nextCursor: null };
  }

  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  qs.set("limit", String(Math.min(params.limit ?? 10, 10)));

  const res = await fetch(`${BASE}/v1/polymarket/traders/analysis?${qs}`, {
    headers: { Authorization: `Bearer ${KEY}` },
    signal: AbortSignal.timeout(8000),
  });

  if (res.status === 429) throw new Error("RATE_LIMITED");
  if (res.status === 503 || res.status === 502) {
    console.warn("[radion] service unavailable — returning empty");
    return { analyses: [], nextCursor: null };
  }
  if (!res.ok) throw new Error(`Radion ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { traders?: TraderAnalysis[]; next_cursor?: string };
  return {
    analyses: data.traders ?? [],
    nextCursor: data.next_cursor ?? null,
  };
}

export async function getTraderAnalysis(
  address: string,
): Promise<TraderAnalysis | null> {
  if (!KEY) return null;

  const res = await fetch(
    `${BASE}/v1/polymarket/traders/${encodeURIComponent(address)}/analysis`,
    {
      headers: { Authorization: `Bearer ${KEY}` },
      signal: AbortSignal.timeout(8000),
    },
  );

  if (res.status === 404) return null;
  if (res.status === 503 || res.status === 502) return null;
  if (!res.ok) throw new Error(`Radion ${res.status}: ${await res.text()}`);

  return res.json() as Promise<TraderAnalysis>;
}
