-- ============================================================
-- SayShop Notification System — Database Setup
-- Run this SQL in the Supabase SQL Editor
-- ============================================================

-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system' 
    CHECK (type IN ('order_update', 'new_order', 'low_stock', 'payment_status', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can only read their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- For server-side operations (service role), allow all inserts
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- 5. Enable Realtime on the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 6. Auto-cleanup: Delete notifications older than 30 days (optional cron)
-- You can set this up via Supabase Dashboard > Database > Extensions > pg_cron
-- SELECT cron.schedule('cleanup-old-notifications', '0 3 * * *', 
--   $$DELETE FROM notifications WHERE created_at < now() - interval '30 days'$$
-- );
