-- assessments table (Blueprint section 5)
-- Stores assessment records with denormalized fields for queries

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL, -- p_hash from environment profile
  mode TEXT NOT NULL CHECK (mode IN ('recommend', 'checkup')),
  status TEXT NOT NULL CHECK (status IN ('ok', 'degraded', 'abstained', 'failed')),
  idempotency_key UUID NOT NULL UNIQUE,
  request JSONB NOT NULL,
  response JSONB,
  model_id TEXT,
  top_crop_id TEXT,
  top_class TEXT,
  top_score NUMERIC(5, 2),
  reliability_tier TEXT CHECK (reliability_tier IN ('high', 'medium', 'low')),
  moisture INTEGER NOT NULL CHECK (moisture >= 1 AND moisture <= 5),
  current_crop TEXT,
  photo_path TEXT,
  rerun_of UUID REFERENCES assessments(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_assessments_user ON assessments(user_id);
CREATE INDEX idx_assessments_field ON assessments(field_id);
CREATE INDEX idx_assessments_created ON assessments(created_at DESC);
CREATE INDEX idx_assessments_deleted ON assessments(deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_assessments_idempotency ON assessments(idempotency_key);
CREATE INDEX idx_assessments_model ON assessments(model_id);
CREATE INDEX idx_assessments_status ON assessments(status);

-- RLS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Owner can read own assessments
CREATE POLICY "Users can read own assessments"
  ON assessments FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Admins can read all assessments
CREATE POLICY "Admins can read all assessments"
  ON assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can insert their own assessments
CREATE POLICY "Users can insert own assessments"
  ON assessments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can soft-delete (update deleted_at) their own assessments
CREATE POLICY "Users can delete own assessments"
  ON assessments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update any assessment (for reprocessing)
CREATE POLICY "Admins can update any assessment"
  ON assessments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Function to check hourly quota (Blueprint section 5.2)
CREATE OR REPLACE FUNCTION check_assessment_quota(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  count_last_hour INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_last_hour
  FROM assessments
  WHERE user_id = user_uuid
    AND created_at > now() - INTERVAL '1 hour'
    AND status != 'failed';
  
  RETURN count_last_hour < 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
