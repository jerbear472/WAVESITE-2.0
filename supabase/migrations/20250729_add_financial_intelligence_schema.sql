-- Financial Intelligence Database Schema
-- Extends WAVESITE2 trend system with financial data extraction

-- Add financial columns to existing trend_submissions table
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS financial_relevance_score DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS financial_signals_processed BOOLEAN DEFAULT FALSE;
ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS hedge_fund_alert_sent BOOLEAN DEFAULT FALSE;

-- Financial Signals table
CREATE TABLE IF NOT EXISTS financial_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
  
  -- Entity extraction results
  mentioned_brands JSONB, -- [{name, ticker, confidence, sector}]
  mentioned_products JSONB, -- [product names and categories]
  stock_tickers JSONB, -- [extracted ticker symbols]
  crypto_mentions JSONB, -- [crypto currencies mentioned]
  
  -- Investment signals
  investment_timing VARCHAR(50), -- early_entry, growth_momentum, etc.
  market_sentiment VARCHAR(50), -- bullish, bearish, neutral
  consumer_behavior JSONB, -- spending patterns, demographics
  sector_impacts JSONB, -- affected market sectors
  
  -- Scoring and relevance
  financial_relevance_score DECIMAL(5,2),
  signal_strength DECIMAL(5,2),
  confidence_level DECIMAL(5,2),
  
  -- Timing and urgency
  time_sensitivity VARCHAR(50), -- immediate, short_term, medium_term
  estimated_market_impact VARCHAR(50), -- low, medium, high, very_high
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Signals table
CREATE TABLE IF NOT EXISTS stock_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_signal_id UUID REFERENCES financial_signals(id) ON DELETE CASCADE,
  trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
  
  -- Stock identification
  ticker VARCHAR(10) NOT NULL,
  company_name VARCHAR(255),
  sector VARCHAR(100),
  market_cap VARCHAR(50), -- mega, large, mid, small, micro
  
  -- Signal details
  signal_type VARCHAR(50), -- viral_product, meme_momentum, luxury_consumption
  direction VARCHAR(10), -- bullish, bearish, neutral
  strength DECIMAL(5,2), -- 0-100 signal strength
  urgency VARCHAR(20), -- low, medium, high, critical
  
  -- Investment thesis
  catalyst TEXT, -- what's driving the signal
  risk_factors JSONB, -- identified risks
  time_horizon VARCHAR(50), -- 1-7 days, 1-4 weeks, 1-3 months
  
  -- Performance tracking
  price_at_signal DECIMAL(10,2), -- stock price when signal generated
  max_price_move DECIMAL(10,2), -- track signal performance
  signal_validated BOOLEAN DEFAULT NULL, -- track accuracy
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- when signal becomes stale
);

-- Hedge Fund Alerts table
CREATE TABLE IF NOT EXISTS hedge_fund_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_signal_id UUID REFERENCES financial_signals(id) ON DELETE CASCADE,
  trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type VARCHAR(50), -- meme_stock_momentum, viral_product_breakout, etc.
  urgency VARCHAR(20), -- low, medium, high, critical
  title VARCHAR(255),
  message TEXT,
  
  -- Targeting
  client_tier VARCHAR(20), -- starter, professional, enterprise
  sent_to_clients JSONB, -- array of client IDs who received this
  
  -- Performance
  click_through_rate DECIMAL(5,2),
  client_actions JSONB, -- track how clients responded
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Brand Database table
CREATE TABLE IF NOT EXISTS brand_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name VARCHAR(255) NOT NULL UNIQUE,
  ticker VARCHAR(10), -- NULL for private companies
  aliases JSONB, -- alternative names/product names
  sector VARCHAR(100),
  market_cap VARCHAR(50),
  is_public BOOLEAN DEFAULT TRUE,
  
  -- For matching improvement
  match_confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
  context_keywords JSONB, -- words that help identify brand mentions
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hedge Fund Clients table
CREATE TABLE IF NOT EXISTS hedge_fund_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50), -- starter, professional, enterprise, exclusive
  
  -- API access
  api_key VARCHAR(255) UNIQUE,
  api_calls_limit INTEGER,
  api_calls_used INTEGER DEFAULT 0,
  
  -- Alert preferences  
  alert_preferences JSONB, -- which types of alerts they want
  minimum_relevance_score DECIMAL(5,2) DEFAULT 70.00,
  sectors_of_interest JSONB, -- array of sectors they care about
  
  -- Billing
  monthly_fee DECIMAL(10,2),
  contract_start DATE,
  contract_end DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE
);

-- Signal Performance tracking
CREATE TABLE IF NOT EXISTS signal_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_signal_id UUID REFERENCES stock_signals(id) ON DELETE CASCADE,
  
  -- Price tracking
  signal_date DATE,
  price_at_signal DECIMAL(10,2),
  price_1d DECIMAL(10,2),
  price_3d DECIMAL(10,2),
  price_7d DECIMAL(10,2),
  price_30d DECIMAL(10,2),
  
  -- Performance metrics
  max_gain_pct DECIMAL(8,2),
  max_loss_pct DECIMAL(8,2),
  signal_accuracy_score DECIMAL(5,2), -- how accurate the signal was
  
  -- Volume and engagement correlation
  volume_spike BOOLEAN,
  social_engagement_spike BOOLEAN,
  news_coverage BOOLEAN,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Usage Logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES hedge_fund_clients(id) ON DELETE CASCADE,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  response_time_ms INTEGER,
  status_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trends_financial_relevance ON trend_submissions(financial_relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_financial_signals_trend ON financial_signals(trend_id);
CREATE INDEX IF NOT EXISTS idx_stock_signals_ticker ON stock_signals(ticker);
CREATE INDEX IF NOT EXISTS idx_stock_signals_urgency ON stock_signals(urgency, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hedge_fund_alerts_urgency ON hedge_fund_alerts(urgency, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_database_name ON brand_database(brand_name);
CREATE INDEX IF NOT EXISTS idx_api_usage_client ON api_usage_logs(client_id, created_at DESC);

-- Row Level Security
ALTER TABLE financial_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hedge_fund_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hedge_fund_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hedge fund access
CREATE POLICY "Hedge fund clients can view their signals" ON financial_signals
  FOR SELECT USING (
    auth.jwt() ->> 'user_type' = 'hedge_fund' OR
    auth.jwt() ->> 'user_type' = 'enterprise'
  );

CREATE POLICY "Hedge fund clients can view stock signals" ON stock_signals
  FOR SELECT USING (
    auth.jwt() ->> 'user_type' = 'hedge_fund' OR
    auth.jwt() ->> 'user_type' = 'enterprise'
  );

CREATE POLICY "Hedge fund clients can view their alerts" ON hedge_fund_alerts
  FOR SELECT USING (
    auth.jwt() ->> 'user_type' = 'hedge_fund' OR
    sent_to_clients ? (auth.jwt() ->> 'sub')
  );

-- Initial brand database seed data
INSERT INTO brand_database (brand_name, ticker, aliases, sector, market_cap, is_public) VALUES
('Apple', 'AAPL', '["iPhone", "iPad", "MacBook", "AirPods", "iOS", "Vision Pro"]', 'Technology', 'mega', TRUE),
('Tesla', 'TSLA', '["Model S", "Model 3", "Model Y", "Model X", "Cybertruck", "Elon Musk"]', 'Automotive', 'large', TRUE),
('Nike', 'NKE', '["Air Jordan", "Air Max", "Swoosh", "Just Do It", "Dunks"]', 'Consumer Discretionary', 'large', TRUE),
('Starbucks', 'SBUX', '["Frappuccino", "Pumpkin Spice", "Pike Place", "Venti", "Trenta"]', 'Consumer Discretionary', 'large', TRUE),
('Lululemon', 'LULU', '["Align Pants", "Everywhere Belt", "Scuba Hoodie", "Define Jacket"]', 'Consumer Discretionary', 'large', TRUE),
('GameStop', 'GME', '["Gamestop", "Game Stop", "Power to the Players"]', 'Retail', 'small', TRUE),
('AMC', 'AMC', '["AMC Theatres", "AMC Entertainment", "AMC Popcorn"]', 'Entertainment', 'small', TRUE),
('Stanley', NULL, '["Stanley Cup", "Stanley Tumbler", "Stanley Bottle", "Quencher"]', 'Consumer Products', 'private', FALSE),
('Nvidia', 'NVDA', '["GeForce", "RTX", "CUDA", "AI Chips", "Jensen Huang"]', 'Technology', 'mega', TRUE),
('Meta', 'META', '["Facebook", "Instagram", "WhatsApp", "Oculus", "Quest", "Threads"]', 'Technology', 'mega', TRUE),
('Amazon', 'AMZN', '["Prime", "Alexa", "AWS", "Whole Foods", "Ring"]', 'Technology', 'mega', TRUE),
('Microsoft', 'MSFT', '["Windows", "Xbox", "Office", "Teams", "Copilot", "ChatGPT"]', 'Technology', 'mega', TRUE),
('Netflix', 'NFLX', '["Stranger Things", "Squid Game", "Netflix and Chill"]', 'Communication Services', 'large', TRUE),
('Disney', 'DIS', '["Mickey Mouse", "Marvel", "Star Wars", "Disney+", "Pixar"]', 'Communication Services', 'large', TRUE),
('Coca-Cola', 'KO', '["Coke", "Diet Coke", "Sprite", "Fanta"]', 'Consumer Staples', 'large', TRUE),
('McDonald''s', 'MCD', '["Big Mac", "McNuggets", "Happy Meal", "McFlurry", "Travis Scott Meal"]', 'Consumer Discretionary', 'large', TRUE),
('Chipotle', 'CMG', '["Burrito Bowl", "Chipotle Bowl", "Guac"]', 'Consumer Discretionary', 'large', TRUE),
('Peloton', 'PTON', '["Peloton Bike", "Peloton Tread", "Peloton App"]', 'Consumer Discretionary', 'small', TRUE),
('Spotify', 'SPOT', '["Spotify Wrapped", "Discover Weekly", "Joe Rogan"]', 'Communication Services', 'mid', TRUE),
('Airbnb', 'ABNB', '["Airbnb Experiences", "Superhost"]', 'Consumer Discretionary', 'large', TRUE)
ON CONFLICT (brand_name) DO NOTHING;

-- Functions for financial analysis
CREATE OR REPLACE FUNCTION calculate_financial_relevance(trend_data JSONB)
RETURNS DECIMAL AS $$
DECLARE
  relevance_score DECIMAL := 0;
  brand_count INTEGER;
  category_bonus DECIMAL;
BEGIN
  -- Count brand mentions
  SELECT COUNT(*) INTO brand_count
  FROM brand_database
  WHERE trend_data->>'description' ILIKE '%' || brand_name || '%'
     OR trend_data->>'description' ILIKE ANY(SELECT '%' || jsonb_array_elements_text(aliases) || '%');
  
  relevance_score := relevance_score + (brand_count * 15);
  
  -- Category bonuses
  IF trend_data->>'category' IN ('meme_stock', 'meme_coin', 'luxury', 'tech_gaming') THEN
    relevance_score := relevance_score + 25;
  END IF;
  
  -- Viral bonus
  IF trend_data->>'status' = 'viral' THEN
    relevance_score := relevance_score + 20;
  END IF;
  
  RETURN LEAST(relevance_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_signals_updated_at BEFORE UPDATE ON financial_signals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_database_updated_at BEFORE UPDATE ON brand_database
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();