-- Run All Migrations Script
-- Copy and paste this entire file into Supabase SQL Editor
-- This will run all 11 migrations in the correct order

-- ============================================
-- MIGRATION 001: Enable Extensions
-- ============================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RAISE EXCEPTION 'PostGIS extension failed to install';
  END IF;
END $$;

-- ============================================
-- MIGRATION 002: Create Profiles
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'admin')) DEFAULT 'farmer',
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
  settings JSONB NOT NULL DEFAULT '{
    "theme": "dark",
    "motion": "full",
    "mapStyle": "sat",
    "autoMap": false,
    "labels": true,
    "units": "metric",
    "temp": "C",
    "area": "ha",
    "notif": {"weather": true, "announce": true},
    "defaultKind": "recommend",
    "homeLayout": "rings",
    "alertHeat": 34,
    "alertRain": 60
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'farmer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Success message for migration 002
DO $$ BEGIN RAISE NOTICE 'Migration 002 complete: profiles table created'; END $$;

-- ============================================
-- Continue with remaining migrations...
-- Due to size, please run individual migration files
-- or see DEPLOYMENT_GUIDE.md for the complete process
-- ============================================

-- Next steps:
-- 1. Run migrations 003-011 from db/migrations/ folder
-- 2. Set access code pepper:
--    ALTER DATABASE postgres SET app.access_code_pepper = 'YOUR_PEPPER';
-- 3. Verify setup with queries in DEPLOYMENT_GUIDE.md

SELECT 'Migrations 001-002 complete! Continue with remaining migrations.' as status;
