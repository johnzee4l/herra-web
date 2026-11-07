-- Model registry tables (ML Blueprint section 13.1)
-- Stores model metadata, configurations, and datasets

-- hi_models table
CREATE TABLE IF NOT EXISTS hi_models (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('training', 'evaluating', 'gated', 'champion', 'shadow', 'retired')),
  model_type TEXT NOT NULL DEFAULT 'gradient_boosted_trees',
  dataset_id TEXT NOT NULL,
  feature_schema_hash TEXT NOT NULL,
  grid_hash TEXT NOT NULL,
  metrics JSONB NOT NULL,
  gate_results JSONB,
  report JSONB,
  storage_path TEXT,
  promoted_at TIMESTAMPTZ,
  promoted_by UUID REFERENCES profiles(id),
  promotion_reason TEXT,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hi_models_status ON hi_models(status);
CREATE INDEX idx_hi_models_dataset ON hi_models(dataset_id);
CREATE INDEX idx_hi_models_created ON hi_models(created_at DESC);
CREATE UNIQUE INDEX idx_hi_models_champion ON hi_models(status) WHERE status = 'champion';

-- RLS
ALTER TABLE hi_models ENABLE ROW LEVEL SECURITY;

-- Admins can read all models
CREATE POLICY "Admins can read models"
  ON hi_models FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- System/admins can manage models
CREATE POLICY "Admins can manage models"
  ON hi_models FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- hi_config table
CREATE TABLE IF NOT EXISTS hi_config (
  id SERIAL PRIMARY KEY,
  crop_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  family TEXT NOT NULL,
  thresholds JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hi_config_active ON hi_config(active) WHERE active = true;

-- RLS
ALTER TABLE hi_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read active crop configs (for assessments)
CREATE POLICY "Anyone can read active crop config"
  ON hi_config FOR SELECT
  USING (active = true);

-- Admins can manage configs
CREATE POLICY "Admins can manage crop config"
  ON hi_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Trigger for updated_at and version bump
CREATE OR REPLACE FUNCTION bump_config_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hi_config_version_bump
  BEFORE UPDATE ON hi_config
  FOR EACH ROW
  EXECUTE FUNCTION bump_config_version();

-- hi_datasets table
CREATE TABLE IF NOT EXISTS hi_datasets (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('building', 'ready', 'archived')),
  manifest JSONB NOT NULL,
  feature_schema_hash TEXT NOT NULL,
  grid_hash TEXT NOT NULL,
  split_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hi_datasets_status ON hi_datasets(status);
CREATE INDEX idx_hi_datasets_created ON hi_datasets(created_at DESC);

-- RLS
ALTER TABLE hi_datasets ENABLE ROW LEVEL SECURITY;

-- Admins can read datasets
CREATE POLICY "Admins can read datasets"
  ON hi_datasets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- System can manage datasets
CREATE POLICY "Admins can manage datasets"
  ON hi_datasets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- hi_promote_model function (ML Blueprint 13.2)
CREATE OR REPLACE FUNCTION hi_promote_model(
  model_id_param TEXT,
  reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  model_record RECORD;
  current_champion TEXT;
BEGIN
  -- Get model
  SELECT * INTO model_record FROM hi_models WHERE id = model_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'model_not_found'
    );
  END IF;
  
  -- Must be gated
  IF model_record.status != 'gated' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'model_not_gated',
      'message', 'Only gated models can be promoted'
    );
  END IF;
  
  -- Check gate results
  IF model_record.gate_results->>'passed' != 'true' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'gate_not_passed',
      'failed_criterion', model_record.gate_results->>'failed_criterion'
    );
  END IF;
  
  -- Get current champion if exists
  SELECT id INTO current_champion FROM hi_models WHERE status = 'champion';
  
  -- Retire current champion
  IF current_champion IS NOT NULL THEN
    UPDATE hi_models
    SET status = 'retired', retired_at = now()
    WHERE id = current_champion;
  END IF;
  
  -- Promote new model
  UPDATE hi_models
  SET 
    status = 'champion',
    promoted_at = now(),
    promoted_by = auth.uid(),
    promotion_reason = reason
  WHERE id = model_id_param;
  
  -- Write audit log
  PERFORM write_audit_log(
    'model.promote',
    'model',
    model_id_param,
    jsonb_build_object(
      'reason', reason,
      'previous_champion', current_champion
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'model_id', model_id_param,
    'previous_champion', current_champion
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- hi_rollback function
CREATE OR REPLACE FUNCTION hi_rollback(
  reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_champion TEXT;
  previous_model TEXT;
BEGIN
  -- Get current champion
  SELECT id INTO current_champion FROM hi_models WHERE status = 'champion';
  
  IF current_champion IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_champion'
    );
  END IF;
  
  -- Find most recently retired model
  SELECT id INTO previous_model
  FROM hi_models
  WHERE status = 'retired'
  ORDER BY retired_at DESC NULLS LAST
  LIMIT 1;
  
  IF previous_model IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_previous_model'
    );
  END IF;
  
  -- Retire current champion
  UPDATE hi_models
  SET status = 'retired', retired_at = now()
  WHERE id = current_champion;
  
  -- Restore previous model
  UPDATE hi_models
  SET 
    status = 'champion',
    promoted_at = now(),
    promoted_by = auth.uid(),
    promotion_reason = 'Rollback: ' || reason
  WHERE id = previous_model;
  
  -- Write audit log
  PERFORM write_audit_log(
    'model.rollback',
    'model',
    previous_model,
    jsonb_build_object(
      'reason', reason,
      'rolled_back_from', current_champion
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'restored_model', previous_model,
    'retired_model', current_champion
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
