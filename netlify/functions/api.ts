import serverless from "serverless-http";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { statsRoutes } from "../../src/routes/stats.js";
import { leaderboardRoutes } from "../../src/routes/leaderboard.js";
import { walletRoutes } from "../../src/routes/wallet.js";
import { searchRoutes } from "../../src/routes/search.js";
import { marketsRoutes } from "../../src/routes/markets.js";

let _handler: ReturnType<typeof serverless> | null = null;

async function getHandler() {
  if (_handler) return _handler;

  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "*",
    methods: ["GET", "OPTIONS"],
  });

  app.get("/health", async () => ({ ok: true, ts: Date.now() }));
  await app.register(statsRoutes, { prefix: "/v1" });
  await app.register(leaderboardRoutes, { prefix: "/v1/leaderboard" });
  await app.register(walletRoutes, { prefix: "/v1/wallet" });
  await app.register(searchRoutes, { prefix: "/v1" });
  await app.register(marketsRoutes, { prefix: "/v1" });
  await app.ready();

  _handler = serverless(app);
  return _handler;
}

export const handler = async (event: unknown, context: unknown) => {
  const h = await getHandler();
  return h(event as Record<string, unknown>, context as Record<string, unknown>);
};
