import { fetch } from "undici";

const BASE = "https://api-v2.polyrouter.io";
const KEY = process.env.POLYROUTER_API_KEY ?? "";

// ─── Fallback only — call when Synthesis returns 429 ─────────────────────────

function headers() {
  return { Authorization: `Bearer ${KEY}` };
}

export async function getKalshiProfile(username: string): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${BASE}/profile/info?platform=kalshi&user=${encodeURIComponent(username)}&include_metrics=true`,
    { headers: headers(), signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`PolyRouter ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function getPolymarketProfile(
  address: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${BASE}/profile/info?platform=polymarket&user=${encodeURIComponent(address)}&include_metrics=true`,
    { headers: headers(), signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`PolyRouter ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function getKalshiTrades(username: string): Promise<unknown[]> {
  const res = await fetch(
    `${BASE}/profile/trades?platform=kalshi&user=${encodeURIComponent(username)}`,
    { headers: headers(), signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`PolyRouter ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as unknown[];
  return Array.isArray(data) ? data : [];
}
