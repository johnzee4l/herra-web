-- access_codes table (Blueprint section 6.2)
-- Codes are hashed with HMAC-SHA256

CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  code_hint TEXT NOT NULL, -- last 4 chars for display
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_codes_space ON access_codes(space_id);
CREATE INDEX idx_access_codes_hash ON access_codes(code_hash);

-- RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can read access codes
CREATE POLICY "Admins can read access codes"
  ON access_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert access codes"
  ON access_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update access codes"
  ON access_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- space_members table (Blueprint section 5)
CREATE TABLE IF NOT EXISTS space_members (
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  via_code_id UUID REFERENCES access_codes(id),
  PRIMARY KEY (space_id, user_id)
);

CREATE INDEX idx_space_members_user ON space_members(user_id);
CREATE INDEX idx_space_members_space ON space_members(space_id);

-- RLS
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;

-- Members can read their own memberships, admins can read all
CREATE POLICY "Users can read own memberships"
  ON space_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all memberships"
  ON space_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- join_space function handles inserts, admins can also insert directly
CREATE POLICY "Admins can insert memberships"
  ON space_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete memberships"
  ON space_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- join_space function (Blueprint section 6.2)
-- SECURITY DEFINER to bypass RLS for the insert
CREATE OR REPLACE FUNCTION join_space(code_text TEXT)
RETURNS JSONB AS $$
DECLARE
  normalized_code TEXT;
  code_hash_value TEXT;
  code_record RECORD;
  space_record RECORD;
  pepper TEXT;
BEGIN
  -- Get pepper from environment (set via Supabase dashboard)
  pepper := current_setting('app.access_code_pepper', true);
  IF pepper IS NULL OR pepper = '' THEN
    RAISE EXCEPTION 'Access code pepper not configured';
  END IF;

  -- Normalize code (Blueprint 6.2)
  normalized_code := upper(regexp_replace(code_text, '[^A-Z0-9]', '', 'g'));
  normalized_code := translate(normalized_code, 'ILOU', '1100');
  
  -- Compute hash
  code_hash_value := encode(
    hmac(normalized_code, pepper, 'sha256'),
    'hex'
  );
  
  -- Find matching code
  SELECT * INTO code_record
  FROM access_codes
  WHERE code_hash = code_hash_value
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR uses < max_uses);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Invalid or expired access code'
    );
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = code_record.space_id
      AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_member',
      'message', 'You are already a member of this space'
    );
  END IF;
  
  -- Insert membership
  INSERT INTO space_members (space_id, user_id, via_code_id)
  VALUES (code_record.space_id, auth.uid(), code_record.id);
  
  -- Increment uses
  UPDATE access_codes
  SET uses = uses + 1
  WHERE id = code_record.id;
  
  -- Get space info
  SELECT name INTO space_record FROM spaces WHERE id = code_record.space_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'space_id', code_record.space_id,
    'space_name', space_record.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
