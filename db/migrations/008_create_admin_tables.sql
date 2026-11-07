-- advisory_rules table (Blueprint section 5, F-34-35 P1)
-- Tip rules keyed by HI codes

CREATE TABLE IF NOT EXISTS advisory_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_code TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warn', 'risk')),
  text_key TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_advisory_rules_active ON advisory_rules(active) WHERE active = true;

-- RLS
ALTER TABLE advisory_rules ENABLE ROW LEVEL SECURITY;

-- Everyone can read active rules (served through server components)
CREATE POLICY "Anyone can read active advisory rules"
  ON advisory_rules FOR SELECT
  USING (active = true);

-- Admins can manage rules
CREATE POLICY "Admins can manage advisory rules"
  ON advisory_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER advisory_rules_updated_at
  BEFORE UPDATE ON advisory_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- audit_log table (Blueprint section 5, F-39 P1)
-- Insert-only log of admin actions

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit log
CREATE POLICY "Admins can read audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- System inserts via service role (no INSERT policy for regular users)

-- rate_limits table (Blueprint section 5.2)
-- Access-code attempts and assessment quotas

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_rate_limits_expires ON rate_limits(expires_at);

-- RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies - only accessed via service role

-- app_settings table (Blueprint section 5)
-- Global configuration and provider check results

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read settings
CREATE POLICY "Admins can read app settings"
  ON app_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can update settings
CREATE POLICY "Admins can update app settings"
  ON app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert default settings
INSERT INTO app_settings (key, value) VALUES
  ('alert_thresholds', '{"heat": 34, "rain": 60}'::jsonb),
  ('health_weights', '{"fit": 0.34, "water": 0.26, "thermal": 0.22, "soil": 0.18}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Function to write audit log (helper for triggers and server actions)
CREATE OR REPLACE FUNCTION write_audit_log(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_log (actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_meta)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
