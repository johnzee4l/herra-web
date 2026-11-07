-- Bootstrap seed data (Blueprint section 6.1)
-- Creates first admin and sample data for testing

-- Note: The first admin must be created manually after signup
-- Run this AFTER the first user signs up via the app:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';

-- Insert sample advisory rules
INSERT INTO advisory_rules (trigger_code, severity, text_key, active) VALUES
  ('tip.soil_ph_low', 'warn', 'advisory.soil_ph_low', true),
  ('tip.soil_ph_high', 'warn', 'advisory.soil_ph_high', true),
  ('tip.dry_spell', 'warn', 'advisory.dry_spell', true),
  ('tip.heavy_rain', 'warn', 'advisory.heavy_rain', true),
  ('tip.heat', 'warn', 'advisory.heat', true),
  ('tip.planting_window', 'info', 'advisory.planting_window', true),
  ('tip.field_split', 'warn', 'advisory.field_split', true),
  ('tip.moisture_recheck', 'info', 'advisory.moisture_recheck', true),
  ('tip.wind', 'info', 'advisory.wind', true),
  ('tip.spacing', 'info', 'advisory.spacing', true),
  ('tip.health_water', 'warn', 'advisory.health_water', true),
  ('tip.health_thermal', 'warn', 'advisory.health_thermal', true),
  ('tip.consider_crop', 'info', 'advisory.consider_crop', true)
ON CONFLICT (trigger_code) DO NOTHING;

-- Insert sample crop configs (from lib/spec/crops.ts)
INSERT INTO hi_config (crop_id, name, family, thresholds, metadata, active) VALUES
  ('rice', 'Rice', 'cereal', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb, 
   '{"local": "Palay", "water": "high", "heat": 35, "wind": 0, "ideal": 4, "sys": "20×20 cm, transplanted"}'::jsonb, true),
  ('corn', 'Corn', 'cereal', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb,
   '{"local": "Mais", "water": "moderate", "heat": 33, "wind": 1, "ideal": 3, "sys": "75×25 cm, 1-2 seeds per hole"}'::jsonb, true),
  ('cassava', 'Cassava', 'root', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb,
   '{"local": "Kamoteng kahoy", "water": "low", "heat": 36, "wind": 0, "ideal": 2, "sys": "1×1 m, stem cuttings"}'::jsonb, true),
  ('sweet_potato', 'Sweet potato', 'root', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb,
   '{"local": "Kamote", "water": "moderate", "heat": 34, "wind": 0, "ideal": 3, "sys": "75×30 cm, vine cuttings"}'::jsonb, true),
  ('peanut', 'Peanut', 'legume', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb,
   '{"local": "Mani", "water": "moderate", "heat": 33, "wind": 0, "ideal": 3, "sys": "30×10 cm, 2 seeds per hole"}'::jsonb, true),
  ('mungbean', 'Mungbean', 'legume', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb,
   '{"local": "Munggo", "water": "low", "heat": 34, "wind": 0, "ideal": 2, "sys": "30×10 cm, 2-3 seeds per hole"}'::jsonb, true),
  ('tomato', 'Tomato', 'fruit', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb,
   '{"local": "Kamatis", "water": "moderate", "heat": 32, "wind": 1, "ideal": 3, "sys": "60×40 cm, staked"}'::jsonb, true),
  ('eggplant', 'Eggplant', 'vegetable', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb,
   '{"local": "Talong", "water": "moderate", "heat": 33, "wind": 1, "ideal": 3, "sys": "75×60 cm, transplanted"}'::jsonb, true),
  ('squash', 'Squash', 'vegetable', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb,
   '{"local": "Kalabasa", "water": "moderate", "heat": 32, "wind": 0, "ideal": 3, "sys": "2×2 m, 2-3 seeds per hill"}'::jsonb, true),
  ('coconut', 'Coconut', 'plantation', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb,
   '{"local": "Niyog", "water": "moderate", "heat": 35, "wind": 1, "ideal": 3, "sys": "8-9 m triangular, 175/ha"}'::jsonb, true),
  ('banana', 'Banana', 'fruit', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb,
   '{"local": "Saging", "water": "high", "heat": 34, "wind": 1, "ideal": 4, "sys": "2×2 m, 1 sucker per hole"}'::jsonb, true),
  ('mango', 'Mango', 'fruit', '{"s1": 0.85, "s2": 0.70, "s3": 0.55, "s4": 0.40}'::jsonb,
   '{"local": "Mangga", "water": "low", "heat": 35, "wind": 0, "ideal": 2, "sys": "8-10 m, grafted seedlings"}'::jsonb, true)
ON CONFLICT (crop_id) DO NOTHING;

-- Create a stub champion model for development
INSERT INTO hi_models (
  id,
  version,
  status,
  model_type,
  dataset_id,
  feature_schema_hash,
  grid_hash,
  metrics,
  gate_results,
  report,
  storage_path,
  created_at
) VALUES (
  'hi-stub-20261107',
  1,
  'champion',
  'reference_implementation',
  'ds-ph-v1-stub',
  'sha256:stub',
  'grid-ph-20261107',
  '{"macro_f1": 0.0, "note": "Reference implementation, not a trained model"}'::jsonb,
  '{"passed": true, "note": "Stub model for development"}'::jsonb,
  '{"note": "Stub implementation in lib/hi/index.ts"}'::jsonb,
  null,
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Create a stub dataset
INSERT INTO hi_datasets (
  id,
  version,
  status,
  manifest,
  feature_schema_hash,
  grid_hash,
  created_at
) VALUES (
  'ds-ph-v1-stub',
  1,
  'ready',
  '{"sources": ["stub"], "note": "Reference dataset for development"}'::jsonb,
  'sha256:stub',
  'grid-ph-20261107',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Set app.access_code_pepper from environment
-- This should be set in Supabase Dashboard under Database > Configuration
-- ALTER DATABASE postgres SET app.access_code_pepper = 'your-pepper-here';

COMMENT ON DATABASE postgres IS 'To complete setup, run: ALTER DATABASE postgres SET app.access_code_pepper = ''your-pepper-value'';';
