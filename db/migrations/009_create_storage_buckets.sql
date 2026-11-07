-- Storage buckets setup (Blueprint section 5)
-- Run this in the Supabase Storage SQL editor or via migrations

-- Create field-photos bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'field-photos',
  'field-photos',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Create hi-models bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hi-models',
  'hi-models',
  false,
  104857600, -- 100 MB
  ARRAY['application/octet-stream', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for field-photos
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'field-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'field-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can read all photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'field-photos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS policies for hi-models (admin only)
CREATE POLICY "Admins can manage models"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'hi-models'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
