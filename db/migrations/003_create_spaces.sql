-- spaces table (Blueprint section 5)
-- Cooperative regions with PostGIS boundary

CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  boundary GEOMETRY(POLYGON, 4326) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'attention')) DEFAULT 'ok',
  crop_focus TEXT[] NOT NULL DEFAULT '{}',
  place JSONB NOT NULL DEFAULT '{}',
  alert_thresholds JSONB NOT NULL DEFAULT '{
    "heat": 34,
    "rain": 60
  }'::jsonb,
  thumb TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index for boundary queries
CREATE INDEX idx_spaces_boundary ON spaces USING GIST(boundary);

-- RLS
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- Members can read their spaces, admins can read all
CREATE POLICY "Members can read their spaces"
  ON spaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = spaces.id
        AND space_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all spaces"
  ON spaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only admins can insert/update/delete spaces
CREATE POLICY "Admins can insert spaces"
  ON spaces FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update spaces"
  ON spaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete spaces"
  ON spaces FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Trigger to validate space boundary (Blueprint section 5.1)
CREATE OR REPLACE FUNCTION validate_space_boundary()
RETURNS TRIGGER AS $$
BEGIN
  -- Must be valid geometry
  IF NOT ST_IsValid(NEW.boundary) THEN
    RAISE EXCEPTION 'Space boundary must be a valid polygon';
  END IF;
  
  -- Minimum area 2 hectares (20000 m²)
  IF ST_Area(NEW.boundary::geography) < 20000 THEN
    RAISE EXCEPTION 'Space boundary must be at least 2 hectares';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spaces_validate_boundary
  BEFORE INSERT OR UPDATE OF boundary ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION validate_space_boundary();

-- Trigger for updated_at
CREATE TRIGGER spaces_updated_at
  BEFORE UPDATE ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
