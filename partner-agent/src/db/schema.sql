CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,
  region TEXT NOT NULL,
  account_manager TEXT NOT NULL,
  onboarding_stage TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES partners(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  discount_bps INTEGER NOT NULL,
  payment_terms_days INTEGER NOT NULL,
  sla_percent REAL NOT NULL,
  gte INTEGER NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contracts_partner ON contracts(partner_id, status);

CREATE TABLE IF NOT EXISTS price_versions (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  region TEXT NOT NULL,
  list_price_cents INTEGER NOT NULL,
  effective_from TEXT NOT NULL,
  currency TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_region_sku ON price_versions(region, sku);

CREATE TABLE IF NOT EXISTS tier_benefits (
  tier TEXT PRIMARY KEY,
  rebate_bps INTEGER NOT NULL,
  co_marketing_cents INTEGER NOT NULL,
  support_level TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doc_chunks (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL,
  text TEXT NOT NULL,
  region TEXT NOT NULL,
  embedding TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  partner_id TEXT,
  intent TEXT NOT NULL,
  decision TEXT NOT NULL,
  risk REAL NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL
);