-- ===========================================================================
-- Lead Scoring System — Reference DDL
-- Document: LS-BP-001  (see blueprint.md)
-- RDBMS:    PostgreSQL 14+
-- Notes:    Deal values capped at $20M (CHECK constraint).
--           All ML/LLM outputs versioned and replayable via feature snapshots.
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- accounts — company grain (firmographic)
-- ---------------------------------------------------------------------------
CREATE TABLE accounts (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crm_id                 TEXT UNIQUE,
    name                   TEXT NOT NULL,
    industry               TEXT,
    employee_count         INTEGER,
    annual_revenue         NUMERIC(18,2),
    company_stage          TEXT CHECK (company_stage IN ('seed','series_a','series_b','growth','enterprise','public')),
    funding_total_raised   NUMERIC(18,2),
    geo_region             TEXT,
    tech_stack             JSONB,
    icp_fit_rule_score     NUMERIC(3,0) CHECK (icp_fit_rule_score BETWEEN 0 AND 100),
    enrichment_updated_at  TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_industry   ON accounts (industry);
CREATE INDEX idx_accounts_geo_region ON accounts (geo_region);

-- ---------------------------------------------------------------------------
-- contacts — person grain
-- ---------------------------------------------------------------------------
CREATE TABLE contacts (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id            UUID REFERENCES accounts (id),
    email                 TEXT UNIQUE NOT NULL,
    first_name            TEXT,
    last_name             TEXT,
    job_title             TEXT,
    seniority_tier        SMALLINT CHECK (seniority_tier BETWEEN 1 AND 5),   -- 1=C-suite..5=IC
    buying_committee_role TEXT CHECK (buying_committee_role IN ('champion','blocker','evaluator','influencer','unknown')),
    source_channel        TEXT CHECK (source_channel IN ('form','chat','email','event','partner','crm')),
    source_utm            JSONB,                                             -- {source, medium, campaign}
    is_opted_in           BOOLEAN NOT NULL DEFAULT FALSE,                    -- compliance flag
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_account ON contacts (account_id);

-- ---------------------------------------------------------------------------
-- leads — inbound entry grain (single gravity row)
-- ---------------------------------------------------------------------------
CREATE TABLE leads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id          UUID REFERENCES contacts (id),
    account_id          UUID REFERENCES accounts (id),
    lead_source         TEXT NOT NULL CHECK (lead_source IN ('form','chat','email','event','partner','crm','api')),
    inbound_message_text TEXT,
    message_language    TEXT,
    campaign_id         TEXT,
    budget_range        TEXT CHECK (budget_range IN ('unknown','lt_100k','100k_500k','500k_1m','1m_5m','gt_5m')),
    buying_timeline     TEXT CHECK (buying_timeline IN ('immediate','next_quarter','exploring','unknown')),
    zero_party_flags    JSONB,
    status              TEXT NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new','scored','routed','converted','lost','suppressed')),
    ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_status     ON leads (status);
CREATE INDEX idx_leads_ingested   ON leads (ingested_at);
CREATE INDEX idx_leads_contact    ON leads (contact_id);
CREATE INDEX idx_leads_account    ON leads (account_id);

-- ---------------------------------------------------------------------------
-- engagements — event / activity lifeblood of ML features
-- ---------------------------------------------------------------------------
CREATE TABLE engagements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id     UUID NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL CHECK (event_type IN (
                    'email_open','email_click','email_reply','meeting_booked',
                    'demo','content_download','site_visit','page_view','form_submit')),
    event_ts    TIMESTAMPTZ NOT NULL,
    channel     TEXT,
    campaign_id TEXT,
    metadata    JSONB                                                          -- subject, URL, asset, seconds
);
CREATE INDEX idx_engagements_lead_event  ON engagements (lead_id, event_type, event_ts);
CREATE INDEX idx_engagements_ts          ON engagements (event_ts);

-- ---------------------------------------------------------------------------
-- deals — historical outcome / ground truth (ACV capped at $20M)
-- ---------------------------------------------------------------------------
CREATE TABLE deals (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id       UUID REFERENCES accounts (id),
    product_skus     JSONB,
    won_amount_acv   NUMERIC(18,2) CHECK (won_amount_acv IS NULL OR won_amount_acv <= 20000000),
    stage_history    JSONB,                                                     -- [{stage, ts}]
    cycle_length_days INTEGER,
    winloss          TEXT CHECK (winloss IN ('won','lost')),
    created_date     DATE,
    close_date       DATE,
    primary_owner    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deals_account ON deals (account_id);
CREATE INDEX idx_deals_close   ON deals (close_date);
CREATE INDEX idx_deals_winloss ON deals (winloss);

-- ---------------------------------------------------------------------------
-- features — frozen ML input snapshot at scoring time (replayability)
-- ---------------------------------------------------------------------------
CREATE TABLE features (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id        UUID NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    feature_json   JSONB NOT NULL,                                             -- see blueprint.md §2.3
    model_version  TEXT NOT NULL,
    feature_window TEXT NOT NULL DEFAULT '0d',                                 -- '0d' = live snapshot
    as_of_ts       TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_features_lead_version ON features (lead_id, model_version, as_of_ts);

-- ---------------------------------------------------------------------------
-- predictions — every score written, versioned (audit + ground-truth join)
-- ---------------------------------------------------------------------------
CREATE TABLE predictions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id                 UUID NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    model_version           TEXT NOT NULL,
    base_conv_prob          NUMERIC(6,5) CHECK (base_conv_prob BETWEEN 0 AND 1),
    expected_deal_value     NUMERIC(18,2) CHECK (expected_deal_value IS NULL OR expected_deal_value <= 20000000),
    llm_intent_score        SMALLINT CHECK (llm_intent_score BETWEEN 0 AND 100),
    llm_fit_score           SMALLINT CHECK (llm_fit_score BETWEEN 0 AND 100),
    composite_score         SMALLINT CHECK (composite_score BETWEEN 1 AND 100),
    tier                    TEXT CHECK (tier IN ('strategic','commercial','midmarket','nurture','suppress')),
    routing_rule            TEXT,
    scored_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_predictions_lead_version ON predictions (lead_id, model_version, scored_at);
CREATE INDEX idx_predictions_score        ON predictions (composite_score, scored_at);

-- ---------------------------------------------------------------------------
-- outcomes — feedback / ground-truth bridge (closed-won vs closed-lost)
-- ---------------------------------------------------------------------------
CREATE TABLE outcomes (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id              UUID NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    deal_id              UUID REFERENCES deals (id),
    outcome              TEXT CHECK (outcome IN ('won','lost','no_deal','not_contacted')),
    final_deal_value     NUMERIC(18,2) CHECK (final_deal_value IS NULL OR final_deal_value <= 20000000),
    attribution_window_days INTEGER,                                           -- 90..180 label window
    closed_ts            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outcomes_lead        ON outcomes (lead_id);
CREATE INDEX idx_outcomes_outcome     ON outcomes (outcome);
CREATE INDEX idx_outcomes_closed      ON outcomes (closed_ts);

-- ---------------------------------------------------------------------------
-- routing_history — audit of auto-routing decisions + human overrides
-- ---------------------------------------------------------------------------
CREATE TABLE routing_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id         UUID NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    assigned_owner  TEXT,
    tier            TEXT,
    roundrobin_id   TEXT,
    is_override     BOOLEAN NOT NULL DEFAULT FALSE,
    override_reason TEXT,
    routed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_routing_lead ON routing_history (lead_id, routed_at);

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
CREATE TYPE FEATURE_SNAPSHOT AS (
    as_of_ts            TIMESTAMPTZ,
    feature_window      TEXT,
    model_version       TEXT,
    feature_json        JSONB
);

COMMIT;