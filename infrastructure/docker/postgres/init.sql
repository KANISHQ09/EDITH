-- ============================================================
-- VAIC PostgreSQL Initialization Script
-- Runs once on first container start
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE incident_severity AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE incident_status AS ENUM ('ACTIVE', 'MITIGATED', 'RESOLVED', 'CANCELLED');

CREATE TYPE participant_role AS ENUM (
  'INCIDENT_COMMANDER',
  'RESPONDER',
  'OBSERVER',
  'BUSINESS_STAKEHOLDER',
  'PLATFORM_ADMIN',
  'VAIC_SYSTEM'
);

CREATE TYPE classification_type AS ENUM (
  'FACT',
  'HYPOTHESIS',
  'DECISION',
  'ACTION_ITEM',
  'QUESTION',
  'STATUS_UPDATE',
  'SOCIAL'
);

CREATE TYPE item_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'CONFIRMED',
  'REJECTED',
  'RESOLVED'
);

CREATE TYPE tool_action_status AS ENUM (
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'EXECUTING',
  'EXECUTED',
  'FAILED'
);

CREATE TYPE conflict_status AS ENUM (
  'OPEN',
  'RESOLVED',
  'DISMISSED'
);

-- ============================================================
-- TABLES
-- ============================================================

-- Organizations (multi-tenant root)
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  role                participant_role NOT NULL DEFAULT 'RESPONDER',
  voice_embedding_ref TEXT,   -- S3 ref for voice fingerprint (opt-in)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- Incidents
CREATE TABLE incidents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  severity        incident_severity NOT NULL DEFAULT 'P2',
  status          incident_status NOT NULL DEFAULT 'ACTIVE',
  start_ts        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_ts     TIMESTAMPTZ,
  conference_url  TEXT,
  affected_systems TEXT[] NOT NULL DEFAULT '{}',
  settings        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Participants (users in a specific incident session)
CREATE TABLE participants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id   UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  speaker_label TEXT,            -- Diarization label (e.g. "SPEAKER_01")
  role          participant_role NOT NULL DEFAULT 'RESPONDER',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at       TIMESTAMPTZ,
  speaking_time_seconds INTEGER NOT NULL DEFAULT 0
);

-- Transcript Entries (raw ASR output)
CREATE TABLE transcript_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  participant_id  UUID REFERENCES participants(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  start_ts        TIMESTAMPTZ NOT NULL,
  end_ts          TIMESTAMPTZ NOT NULL,
  confidence      FLOAT NOT NULL DEFAULT 1.0,
  audio_ref       TEXT,           -- S3 ref to audio chunk (only if audio persistence enabled)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Classifications (NLP output per transcript entry)
CREATE TABLE classifications (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transcript_entry_id   UUID NOT NULL REFERENCES transcript_entries(id) ON DELETE CASCADE,
  incident_id           UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  type                  classification_type NOT NULL,
  confidence            FLOAT NOT NULL DEFAULT 1.0,
  summary               TEXT,
  entities              JSONB NOT NULL DEFAULT '{}',
  requires_followup     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Facts Registry
CREATE TABLE facts (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id               UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  content                   TEXT NOT NULL,
  source_classification_id  UUID REFERENCES classifications(id) ON DELETE SET NULL,
  status                    item_status NOT NULL DEFAULT 'CONFIRMED',
  confirmed_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hypotheses Registry
CREATE TABLE hypotheses (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id               UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  content                   TEXT NOT NULL,
  source_classification_id  UUID REFERENCES classifications(id) ON DELETE SET NULL,
  status                    item_status NOT NULL DEFAULT 'PENDING',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Decisions Registry
CREATE TABLE decisions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id   UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  decided_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  source_classification_id UUID REFERENCES classifications(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Action Items
CREATE TABLE action_items (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id               UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  content                   TEXT NOT NULL,
  owner_id                  UUID REFERENCES participants(id) ON DELETE SET NULL,
  source_classification_id  UUID REFERENCES classifications(id) ON DELETE SET NULL,
  status                    item_status NOT NULL DEFAULT 'PENDING',
  due_hint                  TEXT,     -- Natural language due time hint from speech
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Questions Registry
CREATE TABLE questions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id               UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  content                   TEXT NOT NULL,
  asked_by                  UUID REFERENCES participants(id) ON DELETE SET NULL,
  source_classification_id  UUID REFERENCES classifications(id) ON DELETE SET NULL,
  status                    item_status NOT NULL DEFAULT 'PENDING',
  answered_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conflicts Registry
CREATE TABLE conflicts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id   UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  fact_a_id     UUID REFERENCES facts(id) ON DELETE CASCADE,
  fact_b_id     UUID REFERENCES facts(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  status        conflict_status NOT NULL DEFAULT 'OPEN',
  resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tool Actions (confirmation gate log)
CREATE TABLE tool_actions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id   UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  tool          TEXT NOT NULL,        -- 'slack' | 'jira' | 'pagerduty' | 'datadog'
  action_type   TEXT NOT NULL,        -- 'post_message' | 'create_issue' | etc.
  payload       JSONB NOT NULL,
  proposed_by   TEXT NOT NULL DEFAULT 'VAIC_SYSTEM',
  confirmed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  status        tool_action_status NOT NULL DEFAULT 'PENDING',
  executed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Log (immutable event store)
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id   UUID REFERENCES incidents(id) ON DELETE SET NULL,
  actor_id      TEXT,           -- user_id or 'VAIC_SYSTEM'
  action        TEXT NOT NULL,
  details       JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Incident lookups by org
CREATE INDEX idx_incidents_org_id ON incidents(org_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_start_ts ON incidents(start_ts DESC);

-- Transcript lookups by incident (most common query pattern)
CREATE INDEX idx_transcript_entries_incident_id ON transcript_entries(incident_id);
CREATE INDEX idx_transcript_entries_incident_ts ON transcript_entries(incident_id, start_ts DESC);

-- Classification lookups
CREATE INDEX idx_classifications_incident_id ON classifications(incident_id);
CREATE INDEX idx_classifications_type ON classifications(incident_id, type);

-- Facts for conflict detection
CREATE INDEX idx_facts_incident_id ON facts(incident_id);
CREATE INDEX idx_facts_status ON facts(incident_id, status);

-- Action items by owner and status
CREATE INDEX idx_action_items_incident_id ON action_items(incident_id);
CREATE INDEX idx_action_items_owner ON action_items(owner_id);
CREATE INDEX idx_action_items_status ON action_items(incident_id, status);

-- Questions by status for unresolved tracking
CREATE INDEX idx_questions_incident_status ON questions(incident_id, status);

-- Conflicts by incident
CREATE INDEX idx_conflicts_incident_id ON conflicts(incident_id);
CREATE INDEX idx_conflicts_status ON conflicts(incident_id, status);

-- Tool actions by status for confirmation gate
CREATE INDEX idx_tool_actions_incident_id ON tool_actions(incident_id);
CREATE INDEX idx_tool_actions_status ON tool_actions(incident_id, status);

-- Audit log by incident and time
CREATE INDEX idx_audit_log_incident_id ON audit_log(incident_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================
-- SEED DATA (local dev only)
-- ============================================================

-- Default organization for local development
INSERT INTO organizations (id, name, slug, settings) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'VAIC Local Dev Org',
  'local-dev',
  '{"transcript_retention_days": 90, "audio_persist": false, "summary_interval_minutes": 15}'
) ON CONFLICT DO NOTHING;

-- Default IC user for local development
INSERT INTO users (id, org_id, name, email, role) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Alex Chen',
  'alex@localdev.vaic',
  'INCIDENT_COMMANDER'
) ON CONFLICT DO NOTHING;

-- Default Responder user for local development
INSERT INTO users (id, org_id, name, email, role) VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Priya Sharma',
  'priya@localdev.vaic',
  'RESPONDER'
) ON CONFLICT DO NOTHING;
