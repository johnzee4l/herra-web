-- fields table (Blueprint section 5)
-- Farm field polygons with PostGIS geometry

CREATE TABLE IF NOT EXISTS fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  geom GEOMETRY(POLYGON, 4326) NOT NULL,
  area_ha NUMERIC(10, 4) NOT NULL,
  centroid GEOMETRY(POINT, 4326) NOT NULL,
  place JSONB NOT NULL DEFAULT '{}',
  current_crop TEXT,
  archived_at TIMESTAMPTZ,
  thumb TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial indexes
CREATE INDEX idx_fields_geom ON fields USING GIST(geom);
CREATE INDEX idx_fields_centroid ON fields USING GIST(centroid);
CREATE INDEX idx_fields_space ON fields(space_id);
CREATE INDEX idx_fields_owner ON fields(owner_id);
CREATE INDEX idx_fields_archived ON fields(archived_at) WHERE archived_at IS NULL;

-- RLS
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;

-- Owner can read own fields, space admins can read fields in their spaces
CREATE POLICY "Owners can read own fields"
  ON fields FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Space admins can read space fields"
  ON fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Owner can insert/update own fields
CREATE POLICY "Owners can insert fields"
  ON fields FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own fields"
  ON fields FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Admins can update/delete any field
CREATE POLICY "Admins can update any field"
  ON fields FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete any field"
  ON fields FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Trigger to validate field geometry (Blueprint section 5.1)
CREATE OR REPLACE FUNCTION validate_field_geometry()
RETURNS TRIGGER AS $$
DECLARE
  space_boundary GEOMETRY;
  field_area_m2 NUMERIC;
BEGIN
  -- Must be valid geometry
  IF NOT ST_IsValid(NEW.geom) THEN
    RAISE EXCEPTION 'Field geometry must be a valid polygon';
  END IF;
  
  -- Calculate area in square meters (geography for accurate measurement)
  field_area_m2 := ST_Area(NEW.geom::geography);
  
  -- Minimum 0.03 hectares (300 m²)
  IF field_area_m2 < 300 THEN
    RAISE EXCEPTION 'Field must be at least 0.03 hectares (300 m²)';
  END IF;
  
  -- Maximum 500 hectares (5,000,000 m²)
  IF field_area_m2 > 5000000 THEN
    RAISE EXCEPTION 'Field must be at most 500 hectares';
  END IF;
  
  -- Set area_ha
  NEW.area_ha := field_area_m2 / 10000;
  
  -- Set centroid
  NEW.centroid := ST_Centroid(NEW.geom);
  
  -- Must lie within space boundary
  SELECT boundary INTO space_boundary
  FROM spaces
  WHERE id = NEW.space_id;
  
  IF NOT ST_Within(NEW.geom, space_boundary) THEN
    RAISE EXCEPTION 'Field must lie entirely within its space boundary';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fields_validate_geometry
  BEFORE INSERT OR UPDATE OF geom, space_id ON fields
  FOR EACH ROW
  EXECUTE FUNCTION validate_field_geometry();

-- Trigger for updated_at
CREATE TRIGGER fields_updated_at
  BEFORE UPDATE ON fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
