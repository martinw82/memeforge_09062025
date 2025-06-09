/*
  # Sponsored Content System Migration

  1. New Tables
    - `sponsors` - Sponsor information and contact details
    - `sponsored_templates` - Links templates to sponsors with date ranges
    - `sponsored_watermarks` - Branded watermarks for sponsored content
    - `ad_impressions` - Track when sponsored content is viewed
    - `ad_clicks` - Track when sponsored content is clicked

  2. Security
    - Enable RLS on all tables
    - Public read access for sponsored content
    - Admin-only write access for sponsor management
    - Authenticated user tracking for impressions/clicks

  3. Performance
    - Indexes for efficient sponsored content queries
    - Date-based filtering for active campaigns
*/

-- Create sponsors table
CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  contact_email text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sponsored_templates table
CREATE TABLE IF NOT EXISTS sponsored_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_url text NOT NULL,
  sponsor_id uuid REFERENCES sponsors(id) ON DELETE CASCADE NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create sponsored_watermarks table
CREATE TABLE IF NOT EXISTS sponsored_watermarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid REFERENCES sponsors(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  position varchar(20) DEFAULT 'bottom-right',
  opacity float DEFAULT 0.8 CHECK (opacity >= 0 AND opacity <= 1),
  size varchar(20) DEFAULT 'medium',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create ad_impressions table
CREATE TABLE IF NOT EXISTS ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid REFERENCES sponsors(id) ON DELETE CASCADE NOT NULL,
  content_type varchar(20) NOT NULL CHECK (content_type IN ('template', 'watermark')),
  content_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  ip_address inet,
  user_agent text,
  timestamp timestamptz DEFAULT now()
);

-- Create ad_clicks table
CREATE TABLE IF NOT EXISTS ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid REFERENCES sponsors(id) ON DELETE CASCADE NOT NULL,
  content_type varchar(20) NOT NULL CHECK (content_type IN ('template', 'watermark', 'logo')),
  content_id uuid,
  link_url text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  ip_address inet,
  user_agent text,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsored_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsored_watermarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;

-- Policies for sponsors table
CREATE POLICY "Sponsors are publicly readable"
  ON sponsors
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Only admins can manage sponsors (placeholder - would implement proper admin roles)
CREATE POLICY "Admin users can manage sponsors"
  ON sponsors
  FOR ALL
  TO authenticated
  USING (false) -- Disabled for now, would implement admin role check
  WITH CHECK (false);

-- Policies for sponsored_templates table
CREATE POLICY "Active sponsored templates are publicly readable"
  ON sponsored_templates
  FOR SELECT
  TO authenticated, anon
  USING (
    is_active = true 
    AND start_date <= now() 
    AND end_date >= now()
  );

CREATE POLICY "Admin users can manage sponsored templates"
  ON sponsored_templates
  FOR ALL
  TO authenticated
  USING (false) -- Disabled for now
  WITH CHECK (false);

-- Policies for sponsored_watermarks table
CREATE POLICY "Active sponsored watermarks are publicly readable"
  ON sponsored_watermarks
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Admin users can manage sponsored watermarks"
  ON sponsored_watermarks
  FOR ALL
  TO authenticated
  USING (false) -- Disabled for now
  WITH CHECK (false);

-- Policies for ad_impressions table
CREATE POLICY "Users can read their own impressions"
  ON ad_impressions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create impressions"
  ON ad_impressions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Policies for ad_clicks table
CREATE POLICY "Users can read their own clicks"
  ON ad_clicks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create clicks"
  ON ad_clicks
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sponsors_active ON sponsors(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sponsored_templates_active ON sponsored_templates(is_active, start_date, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sponsored_templates_sponsor ON sponsored_templates(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_watermarks_active ON sponsored_watermarks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sponsored_watermarks_sponsor ON sponsored_watermarks(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_sponsor ON ad_impressions(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_timestamp ON ad_impressions(timestamp);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_sponsor ON ad_clicks(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_timestamp ON ad_clicks(timestamp);

-- Insert sample sponsor data for development
INSERT INTO sponsors (name, logo_url, website_url, contact_email, is_active) VALUES
  ('TechCorp', 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg', 'https://techcorp.example.com', 'partnerships@techcorp.example.com', true),
  ('MemeFunds', 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg', 'https://memefunds.example.com', 'ads@memefunds.example.com', true),
  ('CryptoWallet Pro', 'https://images.pexels.com/photos/7567529/pexels-photo-7567529.jpeg', 'https://cryptowallet.example.com', 'marketing@cryptowallet.example.com', true);

-- Insert sample sponsored templates
DO $$
DECLARE
  techcorp_id uuid;
  memefunds_id uuid;
  crypto_id uuid;
BEGIN
  SELECT id INTO techcorp_id FROM sponsors WHERE name = 'TechCorp' LIMIT 1;
  SELECT id INTO memefunds_id FROM sponsors WHERE name = 'MemeFunds' LIMIT 1;
  SELECT id INTO crypto_id FROM sponsors WHERE name = 'CryptoWallet Pro' LIMIT 1;

  INSERT INTO sponsored_templates (template_name, template_url, sponsor_id, start_date, end_date, priority) VALUES
    ('Tech Innovation Meme', 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg', techcorp_id, now() - interval '1 day', now() + interval '30 days', 10),
    ('Investment Success', 'https://images.pexels.com/photos/6802049/pexels-photo-6802049.jpeg', memefunds_id, now() - interval '1 day', now() + interval '45 days', 8),
    ('Crypto Trading Win', 'https://images.pexels.com/photos/8369524/pexels-photo-8369524.jpeg', crypto_id, now() - interval '1 day', now() + interval '60 days', 5);

  INSERT INTO sponsored_watermarks (sponsor_id, name, image_url, link_url, position, opacity, size) VALUES
    (techcorp_id, 'TechCorp Logo', 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg', 'https://techcorp.example.com', 'bottom-right', 0.7, 'small'),
    (memefunds_id, 'MemeFunds Badge', 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg', 'https://memefunds.example.com', 'bottom-left', 0.8, 'medium'),
    (crypto_id, 'CryptoWallet Stamp', 'https://images.pexels.com/photos/7567529/pexels-photo-7567529.jpeg', 'https://cryptowallet.example.com', 'top-right', 0.6, 'small');
END $$;

-- Function to clean up old tracking data (optional, for data management)
CREATE OR REPLACE FUNCTION cleanup_old_tracking_data()
RETURNS void AS $$
BEGIN
  -- Delete impressions older than 90 days
  DELETE FROM ad_impressions WHERE timestamp < now() - interval '90 days';
  
  -- Delete clicks older than 90 days
  DELETE FROM ad_clicks WHERE timestamp < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;