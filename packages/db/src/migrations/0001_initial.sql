-- Squeeze Sentinel initial schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- tokens
CREATE TABLE IF NOT EXISTS tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol text NOT NULL,
  contract_address text NOT NULL,
  chain text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  total_supply numeric,
  decimals integer,
  metadata jsonb,
  UNIQUE (chain, contract_address)
);

-- entity_clusters
CREATE TABLE IF NOT EXISTS entity_clusters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  confidence real NOT NULL,
  first_observed_case text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- wallets
CREATE TABLE IF NOT EXISTS wallets (
  address text PRIMARY KEY,
  chain text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  labels text[] NOT NULL DEFAULT '{}',
  entity_cluster_id uuid REFERENCES entity_clusters(id),
  flags jsonb,
  last_updated timestamptz NOT NULL DEFAULT now()
);

-- wallet_token_positions (hypertable)
CREATE TABLE IF NOT EXISTS wallet_token_positions (
  wallet_address text NOT NULL,
  token_id uuid NOT NULL REFERENCES tokens(id),
  snapshot_at timestamptz NOT NULL,
  balance numeric NOT NULL,
  pct_of_circulating real NOT NULL,
  PRIMARY KEY (wallet_address, token_id, snapshot_at)
);

-- signals (hypertable)
CREATE TABLE IF NOT EXISTS signals (
  token_id uuid NOT NULL REFERENCES tokens(id),
  plane text NOT NULL,
  signal_id text NOT NULL,
  value real NOT NULL,
  raw_payload jsonb,
  source text NOT NULL,
  observed_at timestamptz NOT NULL,
  PRIMARY KEY (token_id, signal_id, observed_at)
);

-- scores (hypertable)
CREATE TABLE IF NOT EXISTS scores (
  token_id uuid NOT NULL REFERENCES tokens(id),
  scored_at timestamptz NOT NULL,
  composite real NOT NULL,
  plane_scores jsonb NOT NULL,
  band text NOT NULL,
  drawdown_probability real NOT NULL,
  action text NOT NULL,
  contributing_signals text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (token_id, scored_at)
);

-- alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id uuid NOT NULL REFERENCES tokens(id),
  score_id uuid NOT NULL,
  severity text NOT NULL,
  channel text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  dedup_key text UNIQUE NOT NULL
);

-- watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id uuid NOT NULL REFERENCES tokens(id),
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by text NOT NULL DEFAULT 'system',
  active boolean NOT NULL DEFAULT true
);

-- backtest_cases
CREATE TABLE IF NOT EXISTS backtest_cases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_symbol text NOT NULL,
  event_name text NOT NULL,
  pump_start_at timestamptz NOT NULL,
  pump_peak_at timestamptz NOT NULL,
  dump_start_at timestamptz NOT NULL,
  peak_price_usd numeric NOT NULL,
  post_dump_price_usd numeric NOT NULL,
  drawdown_pct real NOT NULL,
  labeled_insider_wallets text[] NOT NULL DEFAULT '{}',
  notes text
);

-- hypertables (requires TimescaleDB)
SELECT create_hypertable('wallet_token_positions', 'snapshot_at', if_not_exists => TRUE);
SELECT create_hypertable('signals', 'observed_at', if_not_exists => TRUE);
SELECT create_hypertable('scores', 'scored_at', if_not_exists => TRUE);

-- indexes
CREATE INDEX IF NOT EXISTS idx_signals_token_plane ON signals (token_id, plane, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_token ON scores (token_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_cluster ON wallets (entity_cluster_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_active ON watchlist (active, token_id);
