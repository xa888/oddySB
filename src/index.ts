import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { testConnection } from "./cache/supabase.js";
import { statsRoutes } from "./routes/stats.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";
import { walletRoutes } from "./routes/wallet.js";
import { searchRoutes } from "./routes/search.js";

const PORT = Number(process.env.PORT ?? 3000);

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
  },
});

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "*",
  methods: ["GET"],
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

// Health check
app.get("/health", async () => ({ ok: true, ts: Date.now() }));

// API v1 routes
await app.register(statsRoutes,       { prefix: "/v1" });
await app.register(leaderboardRoutes, { prefix: "/v1/leaderboard" });
await app.register(walletRoutes,      { prefix: "/v1/wallet" });
await app.register(searchRoutes,      { prefix: "/v1" });

// Connect to Supabase (optional — API works without it, just uncached)
try {
  await testConnection();
  app.log.info("[supabase] connected");
} catch {
  app.log.warn("[supabase] unavailable — running without cache");
}

// Start server
try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`ODDY API running on http://0.0.0.0:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
