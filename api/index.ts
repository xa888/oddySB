import type { IncomingMessage, ServerResponse } from "http";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { statsRoutes } from "../src/routes/stats.js";
import { leaderboardRoutes } from "../src/routes/leaderboard.js";
import { walletRoutes } from "../src/routes/wallet.js";
import { searchRoutes } from "../src/routes/search.js";

const app = Fastify({ logger: false });
let ready = false;

async function init() {
  if (ready) return;
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "*",
    methods: ["GET", "OPTIONS"],
  });
  app.get("/health", async () => ({ ok: true, ts: Date.now() }));
  await app.register(statsRoutes,       { prefix: "/v1" });
  await app.register(leaderboardRoutes, { prefix: "/v1/leaderboard" });
  await app.register(walletRoutes,      { prefix: "/v1/wallet" });
  await app.register(searchRoutes,      { prefix: "/v1" });
  await app.ready();
  ready = true;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await init();
    app.server.emit("request", req, res);
  } catch (err: unknown) {
    // Surface the real crash message so it's visible in the response body
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    console.error("[oddy] handler crash:", message);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: message }));
    }
  }
}
