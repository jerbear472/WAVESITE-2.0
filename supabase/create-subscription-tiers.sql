-- Create subscription tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  price_monthly INTEGER NOT NULL, -- in cents
  price_yearly INTEGER NOT NULL, -- in cents
  features JSONB NOT NULL,
  limits JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, cancelled, expired, trial
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id)
);

-- Create organization table for multi-seat management
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  subscription_id UUID REFERENCES user_subscriptions(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(organization_id, user_id)
);

-- Create feature access log for analytics
CREATE TABLE IF NOT EXISTS feature_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  feature_name VARCHAR(100) NOT NULL,
  access_type VARCHAR(50) NOT NULL, -- view, export, api_call
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create API keys table for enterprise access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Create custom persona clusters for enterprise
CREATE TABLE IF NOT EXISTS custom_persona_clusters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create white label settings for enterprise
CREATE TABLE IF NOT EXISTS white_label_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  custom_domain VARCHAR(255),
  email_from_name VARCHAR(100),
  email_from_address VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(organization_id)
);

-- Insert subscription tiers
INSERT INTO subscription_tiers (name, display_name, price_monthly, price_yearly, features, limits) VALUES
(
  'core',
  'WaveSight Core',
  50000, -- $500/month
  540000, -- $5,400/year (10% discount)
  '{
    "trends_per_month": 10,
    "categories": ["fashion", "food", "memes", "music", "tech"],
    "diffusion_tracking": "basic",
    "regional_data": "city_or_country",
    "user_seats": 3,
    "export_formats": ["csv", "pdf"],
    "support": "email",
    "api_access": false,
    "custom_tags": false,
    "historical_data": "30_days",
    "predictive_alerts": false,
    "white_label": false
  }'::jsonb,
  '{
    "api_calls_per_hour": 0,
    "export_limit_per_month": 10,
    "trends_per_export": 50,
    "custom_personas": 0,
    "saved_searches": 5
  }'::jsonb
),
(
  'professional',
  'WaveSight Pro',
  300000, -- $3,000/month
  324000, -- $32,400/year (10% discount)
  '{
    "trends_per_month": "unlimited",
    "categories": ["fashion", "food", "memes", "music", "tech", "sports", "beauty", "automotive", "wellness", "entertainment", "finance", "health", "travel", "lifestyle"],
    "diffusion_tracking": "advanced",
    "regional_data": "global_comparison",
    "user_seats": "unlimited",
    "export_formats": ["csv", "pdf", "xlsx", "json"],
    "support": "priority_email",
    "api_access": false,
    "custom_tags": true,
    "historical_data": "1_year",
    "predictive_alerts": true,
    "white_label": false,
    "real_time_feed": true,
    "persona_deep_dives": true
  }'::jsonb,
  '{
    "api_calls_per_hour": 0,
    "export_limit_per_month": 100,
    "trends_per_export": 500,
    "custom_personas": 10,
    "saved_searches": 50
  }'::jsonb
),
(
  'enterprise',
  'WaveSight Apex',
  1500000, -- $15,000/month
  1620000, -- $162,000/year (10% discount)
  '{
    "trends_per_month": "unlimited",
    "categories": "all",
    "diffusion_tracking": "advanced",
    "regional_data": "global_granular",
    "user_seats": "unlimited",
    "export_formats": ["csv", "pdf", "xlsx", "json", "api"],
    "support": "dedicated_analyst",
    "api_access": true,
    "custom_tags": true,
    "historical_data": "all_time",
    "predictive_alerts": true,
    "white_label": true,
    "real_time_feed": true,
    "persona_deep_dives": true,
    "custom_persona_clusters": true,
    "ai_predictions": true,
    "custom_scout_commissions": true
  }'::jsonb,
  '{
    "api_calls_per_hour": 10000,
    "export_limit_per_month": "unlimited",
    "trends_per_export": "unlimited",
    "custom_personas": "unlimited",
    "saved_searches": "unlimited"
  }'::jsonb
);

-- Create indexes for better performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_feature_access_log_user_id ON feature_access_log(user_id);
CREATE INDEX idx_feature_access_log_created_at ON feature_access_log(created_at);
CREATE INDEX idx_api_keys_org_id ON api_keys(organization_id);

-- Create RLS policies
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_persona_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_settings ENABLE ROW LEVEL SECURITY;

-- Subscription tiers are readable by all authenticated users
CREATE POLICY "Subscription tiers are viewable by authenticated users"
  ON subscription_tiers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Organization policies
CREATE POLICY "Organization members can view their organization"
  ON organizations FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners can update their organization"
  ON organizations FOR UPDATE
  USING (auth.uid() = owner_id);

-- Organization members policies
CREATE POLICY "Organization members can view members"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Feature access log policies
CREATE POLICY "Users can view their own feature access"
  ON feature_access_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feature access"
  ON feature_access_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- API keys policies
CREATE POLICY "Organization admins can manage API keys"
  ON api_keys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = api_keys.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Custom persona clusters policies
CREATE POLICY "Organization members can view custom personas"
  ON custom_persona_clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = custom_persona_clusters.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- White label settings policies
CREATE POLICY "Organization admins can manage white label settings"
  ON white_label_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = white_label_settings.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Create function to check user's subscription tier
CREATE OR REPLACE FUNCTION get_user_subscription_tier(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  tier_name TEXT;
BEGIN
  SELECT st.name INTO tier_name
  FROM user_subscriptions us
  JOIN subscription_tiers st ON us.tier_id = st.id
  WHERE us.user_id = user_uuid
  AND us.status = 'active'
  AND us.current_period_end > NOW()
  LIMIT 1;
  
  RETURN COALESCE(tier_name, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check feature access
CREATE OR REPLACE FUNCTION check_feature_access(
  user_uuid UUID,
  feature_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  tier_features JSONB;
BEGIN
  -- Get user's tier
  user_tier := get_user_subscription_tier(user_uuid);
  
  -- If no subscription, deny access
  IF user_tier = 'free' THEN
    RETURN FALSE;
  END IF;
  
  -- Get tier features
  SELECT features INTO tier_features
  FROM subscription_tiers
  WHERE name = user_tier;
  
  -- Check if feature exists in tier
  RETURN tier_features ? feature_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log feature access
CREATE OR REPLACE FUNCTION log_feature_access(
  user_uuid UUID,
  feature TEXT,
  access_type TEXT,
  meta JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get user's organization if exists
  SELECT organization_id INTO org_id
  FROM organization_members
  WHERE user_id = user_uuid
  LIMIT 1;
  
  -- Log the access
  INSERT INTO feature_access_log (
    user_id,
    organization_id,
    feature_name,
    access_type,
    metadata
  ) VALUES (
    user_uuid,
    org_id,
    feature,
    access_type,
    meta
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;