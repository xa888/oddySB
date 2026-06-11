-- Run this once in the Supabase SQL editor (or via supabase db push)
-- before deploying the app.

CREATE TABLE IF NOT EXISTS oddy_cache (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL,
  cached_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS oddy_cache_expires ON oddy_cache (expires_at);

-- Optional: auto-delete expired rows nightly (requires pg_cron extension)
-- SELECT cron.schedule('purge-oddy-cache', '0 3 * * *',
--   $$DELETE FROM oddy_cache WHERE expires_at < NOW()$$);
