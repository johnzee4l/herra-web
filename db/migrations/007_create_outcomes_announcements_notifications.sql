-- outcomes table (Blueprint section 5, F-22 P2)
-- Farmer feedback about crop performance

CREATE TABLE IF NOT EXISTS outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  crop_id TEXT NOT NULL,
  result_tag TEXT NOT NULL CHECK (result_tag IN ('good', 'average', 'poor', 'failed')),
  season_end TEXT NOT NULL CHECK (season_end IN ('this_week', 'this_month', 'last_month', 'earlier')),
  note TEXT,
  review_status TEXT CHECK (review_status IN ('pending', 'reviewed', 'rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outcomes_user ON outcomes(user_id);
CREATE INDEX idx_outcomes_field ON outcomes(field_id);
CREATE INDEX idx_outcomes_assessment ON outcomes(assessment_id);
CREATE INDEX idx_outcomes_review_status ON outcomes(review_status);
CREATE INDEX idx_outcomes_created ON outcomes(created_at DESC);

-- RLS
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;

-- Owner can read own outcomes
CREATE POLICY "Users can read own outcomes"
  ON outcomes FOR SELECT
  USING (user_id = auth.uid());

-- Admins can read all outcomes
CREATE POLICY "Admins can read all outcomes"
  ON outcomes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can insert their own outcomes
CREATE POLICY "Users can insert own outcomes"
  ON outcomes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can update outcomes (for review)
CREATE POLICY "Admins can update outcomes"
  ON outcomes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- announcements table (Blueprint section 5, F-04 P2)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_space ON announcements(space_id);
CREATE INDEX idx_announcements_created ON announcements(created_at DESC);

-- RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Space members can read announcements
CREATE POLICY "Members can read space announcements"
  ON announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_members.space_id = announcements.space_id
        AND space_members.user_id = auth.uid()
    )
  );

-- Admins can insert/update/delete announcements
CREATE POLICY "Admins can insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- notifications table (Blueprint section 5, F-24 P1)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('weather_alert', 'announcement', 'entry', 'data', 'outcome')),
  title_key TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  route TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- System can insert notifications (via service role)
-- Users can update read_at on their own notifications
CREATE POLICY "Users can mark own notifications as read"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
