-- Enterprise Features Schema
-- This adds tables and features needed for the enterprise dashboard

-- Add subscription tier to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise', 'hedge_fund'));

-- Enterprise trends table with enhanced metadata
CREATE TABLE IF NOT EXISTS enterprise_trends (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    velocity DECIMAL(5,2) DEFAULT 0,
    sentiment DECIMAL(3,2) DEFAULT 0 CHECK (sentiment >= -1 AND sentiment <= 1),
    geographic_origin TEXT,
    first_spotted TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_phase TEXT DEFAULT 'emerging' CHECK (current_phase IN ('emerging', 'growing', 'viral', 'declining')),
    validation_score DECIMAL(5,2) DEFAULT 0,
    engagement_count INTEGER DEFAULT 0,
    predicted_peak TIMESTAMP WITH TIME ZONE,
    sources JSONB DEFAULT '[]'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys table for enterprise API access
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT UNIQUE NOT NULL,
    permissions JSONB DEFAULT '["read:trends", "read:analytics"]'::jsonb,
    rate_limit INTEGER DEFAULT 1000,
    request_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Custom alerts configuration
CREATE TABLE IF NOT EXISTS enterprise_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('threshold', 'keyword', 'sentiment', 'velocity', 'geographic')),
    conditions JSONB NOT NULL,
    channels JSONB DEFAULT '["email"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert notifications log
CREATE TABLE IF NOT EXISTS alert_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    alert_id UUID REFERENCES enterprise_alerts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Export jobs tracking
CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('csv', 'json', 'excel', 'pdf')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    filters JSONB,
    file_url TEXT,
    file_size BIGINT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Integration configurations
CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('slack', 'teams', 'webhook', 'zapier', 'trading')),
    status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
    config JSONB NOT NULL,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics cache for performance
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, cache_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_enterprise_trends_velocity ON enterprise_trends(velocity DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_trends_category ON enterprise_trends(category);
CREATE INDEX IF NOT EXISTS idx_enterprise_trends_first_spotted ON enterprise_trends(first_spotted DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_trends_user_id ON enterprise_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_enterprise_alerts_user_id ON enterprise_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_user_id ON alert_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_is_read ON alert_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);

-- Row Level Security
ALTER TABLE enterprise_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view trends based on subscription" ON enterprise_trends
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.subscription_tier IN ('professional', 'enterprise', 'hedge_fund')
        )
    );

CREATE POLICY "Users can manage their own API keys" ON api_keys
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own alerts" ON enterprise_alerts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their notifications" ON alert_notifications
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their export jobs" ON export_jobs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their integrations" ON integrations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their analytics cache" ON analytics_cache
    FOR ALL USING (auth.uid() = user_id);

-- Functions for enterprise features
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
BEGIN
    RETURN 'ws_' || encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enterprise_trends_updated_at BEFORE UPDATE ON enterprise_trends
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enterprise_alerts_updated_at BEFORE UPDATE ON enterprise_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();