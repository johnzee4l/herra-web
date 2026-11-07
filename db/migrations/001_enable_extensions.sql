-- Enable required extensions
-- Blueprint section 5: PostGIS for geometry, pgcrypto for functions

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify PostGIS is working
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RAISE EXCEPTION 'PostGIS extension failed to install';
  END IF;
END $$;
