/*
  # Premium Subscription System

  1. New Tables
    - `plans`
      - `id` (text, primary key, e.g., 'premium_monthly')
      - `name` (text, not null)
      - `description` (text)
      - `price` (numeric, not null)
      - `currency` (text, default 'USD')
      - `features` (jsonb, feature flags)
      - `stripe_product_id` (text, unique)
      - `created_at` (timestamp)
    
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users.id)
      - `plan_id` (text, foreign key to plans.id)
      - `stripe_customer_id` (text, unique)
      - `stripe_subscription_id` (text, unique)
      - `status` (text, subscription status)
      - `current_period_start` (timestamp)
      - `current_period_end` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Public read access for plans
    - Users can only read their own subscriptions
    - Admin-only write access for plans

  3. Sample Data
    - Insert default subscription plans
    - Premium monthly and yearly options
*/

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  currency text DEFAULT 'USD',
  features jsonb DEFAULT '{}',
  stripe_product_id text UNIQUE,
  stripe_price_id text UNIQUE,
  interval_type text DEFAULT 'month' CHECK (interval_type IN ('month', 'year')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id text REFERENCES plans(id) NOT NULL,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for plans table
CREATE POLICY "Plans are publicly readable"
  ON plans
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Admin-only write access for plans (placeholder)
CREATE POLICY "Admin users can manage plans"
  ON plans
  FOR ALL
  TO authenticated
  USING (false) -- Disabled for now, would implement admin role check
  WITH CHECK (false);

-- Policies for subscriptions table
CREATE POLICY "Users can read their own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin policy for subscriptions (placeholder)
CREATE POLICY "Admin users can manage all subscriptions"
  ON subscriptions
  FOR ALL
  TO authenticated
  USING (false) -- Disabled for now
  WITH CHECK (false);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Function to update subscription updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscriptions updated_at
DROP TRIGGER IF EXISTS trigger_update_subscription_updated_at ON subscriptions;
CREATE TRIGGER trigger_update_subscription_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Insert default subscription plans
INSERT INTO plans (id, name, description, price, currency, features, interval_type) VALUES
  (
    'premium_monthly',
    'Premium Monthly',
    'Access to all premium features including ad-free experience, exclusive templates, and high-resolution downloads',
    9.99,
    'USD',
    '{"ad_free": true, "exclusive_templates": true, "high_res_download": true, "priority_support": true, "unlimited_nft_mints": true}',
    'month'
  ),
  (
    'premium_yearly',
    'Premium Yearly',
    'Annual premium subscription with 2 months free! All premium features included.',
    99.99,
    'USD',
    '{"ad_free": true, "exclusive_templates": true, "high_res_download": true, "priority_support": true, "unlimited_nft_mints": true, "yearly_bonus": true}',
    'year'
  );

-- Function to check if user has premium subscription
CREATE OR REPLACE FUNCTION is_user_premium(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = user_uuid 
    AND status = 'active' 
    AND current_period_end > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's active subscription
CREATE OR REPLACE FUNCTION get_user_subscription(user_uuid uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_id text,
  plan_name text,
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.plan_id,
    p.name,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end
  FROM subscriptions s
  JOIN plans p ON s.plan_id = p.id
  WHERE s.user_id = user_uuid
  AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired subscriptions
CREATE OR REPLACE FUNCTION cleanup_expired_subscriptions()
RETURNS void AS $$
BEGIN
  -- Mark expired subscriptions as canceled
  UPDATE subscriptions 
  SET status = 'canceled'
  WHERE status = 'active' 
  AND current_period_end < now()
  AND cancel_at_period_end = true;
END;
$$ LANGUAGE plpgsql;