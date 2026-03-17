-- ============================================================================
-- QR Etkinlik Yonetim Sistemi - PostgreSQL Schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','mentor','startup','participant','gorevli');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('earn','room_exit','surprise','approved');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE room_type AS ENUM ('interview','case_study');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 1. EVENT SETTINGS (tek satirlik tablo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  event_name VARCHAR(255) NOT NULL DEFAULT 'Etkinlik 2026',
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO event_settings (id, is_active) VALUES (1, FALSE) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. WHITELIST EMAILS
-- ============================================================================
CREATE TABLE IF NOT EXISTS whitelist_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'participant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'participant',
  qr_secret VARCHAR(64) NOT NULL,
  total_points INT NOT NULL DEFAULT 0,
  assigned_room_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_points ON users(total_points DESC);

-- ============================================================================
-- 4. SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- 5. TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scanned_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points INT NOT NULL,
  type transaction_type NOT NULL,
  room_id UUID,
  surprise_code_id UUID,
  description VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_scanner ON transactions(scanner_id);
CREATE INDEX IF NOT EXISTS idx_tx_scanned ON transactions(scanned_id);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);

-- ============================================================================
-- 6. PENDING SCANS
-- ============================================================================
CREATE TABLE IF NOT EXISTS pending_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scanned_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_ps_pair ON pending_scans(scanner_id, scanned_id);
CREATE INDEX IF NOT EXISTS idx_ps_reverse ON pending_scans(scanned_id, scanner_id);
CREATE INDEX IF NOT EXISTS idx_ps_expires ON pending_scans(expires_at);

-- ============================================================================
-- 7. APPROVAL QUEUE
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status approval_status NOT NULL DEFAULT 'pending',
  points_to_award INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_aq_approver ON approval_queue(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_aq_participant ON approval_queue(participant_id);

-- ============================================================================
-- 8. USED TOKENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS used_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ut_used_at ON used_tokens(used_at);

-- ============================================================================
-- 9. ROOMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type room_type NOT NULL,
  entry_limit INT NOT NULL DEFAULT 0,
  exit_points INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. ROOM ENTRIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS room_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  entry_number INT NOT NULL DEFAULT 1,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  points_awarded INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_re_user_room ON room_entries(user_id, room_id);

-- ============================================================================
-- 11. POINT CONFIG
-- ============================================================================
CREATE TABLE IF NOT EXISTS point_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL UNIQUE,
  points_value INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO point_config (role, points_value) VALUES
  ('participant', 10),
  ('startup', 30),
  ('mentor', 50),
  ('gorevli', 0),
  ('admin', 0)
ON CONFLICT (role) DO NOTHING;

-- ============================================================================
-- 12. SURPRISE CODES
-- ============================================================================
CREATE TABLE IF NOT EXISTS surprise_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  points_value INT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 13. PASSWORD RESETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pr_user ON password_resets(user_id);

-- ============================================================================
-- Auto-update triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_event_settings_updated_at ON event_settings;
CREATE TRIGGER update_event_settings_updated_at
  BEFORE UPDATE ON event_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_point_config_updated_at ON point_config;
CREATE TRIGGER update_point_config_updated_at
  BEFORE UPDATE ON point_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
