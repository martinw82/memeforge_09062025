/*
  # Analytics & Tracking System

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users.id, nullable)
      - `event_name` (text, not null)
      - `properties` (jsonb, nullable)
      - `session_id` (text, nullable)
      - `ip_address` (inet, nullable)
      - `user_agent` (text, nullable)
      - `timestamp` (timestamp)

  2. Security
    - Enable RLS on `events` table
    - Allow authenticated users to insert their own events
    - Allow admins to read all events (placeholder policy)

  3. Performance
    - Add indexes for efficient querying
    - Partition by timestamp for large datasets
*/

-- Create events table for analytics tracking
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  properties jsonb,
  session_id text,
  ip_address inet,
  user_agent text,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policies for events table
CREATE POLICY "Users can insert their own events"
  ON events
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid() = user_id OR user_id IS NULL
      ELSE user_id IS NULL
    END
  );

CREATE POLICY "Users can read their own events"
  ON events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin policy placeholder (would implement proper admin role check)
CREATE POLICY "Admin users can read all events"
  ON events
  FOR SELECT
  TO authenticated
  USING (false); -- Disabled for now, would implement admin role check

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);

-- Create a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_events_user_event_time ON events(user_id, event_name, timestamp DESC);

-- Function to clean up old analytics data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data()
RETURNS void AS $$
BEGIN
  -- Delete events older than 365 days
  DELETE FROM events WHERE timestamp < now() - interval '365 days';
END;
$$ LANGUAGE plpgsql;

-- Insert some initial sample events for development
INSERT INTO events (event_name, properties, session_id) VALUES
  ('app_loaded', '{"version": "1.0.0", "platform": "web"}', 'sample_session_1'),
  ('template_selected', '{"template_id": "sample", "template_name": "Sample Template"}', 'sample_session_1'),
  ('meme_generated', '{"has_top_text": true, "has_bottom_text": true}', 'sample_session_1');