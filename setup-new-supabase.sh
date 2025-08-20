#!/bin/bash

# Setup script for new Supabase project with XP system

echo "========================================="
echo "FreeWaveSight: New Supabase Project Setup"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from FreeWaveSight root directory${NC}"
    exit 1
fi

echo -e "${BLUE}Please provide your new Supabase project details:${NC}"
echo ""

# Get project details from user
read -p "New Supabase Project URL (e.g., abcdefghijk.supabase.co): " NEW_PROJECT_URL
read -p "New Supabase Anon Key: " NEW_ANON_KEY
read -p "New Supabase Service Role Key: " NEW_SERVICE_KEY
read -p "New Database Password: " -s NEW_DB_PASSWORD
echo ""

# Validate inputs
if [ -z "$NEW_PROJECT_URL" ] || [ -z "$NEW_ANON_KEY" ] || [ -z "$NEW_SERVICE_KEY" ]; then
    echo -e "${RED}Error: All fields are required${NC}"
    exit 1
fi

# Extract project reference from URL
PROJECT_REF=$(echo $NEW_PROJECT_URL | cut -d'.' -f1)

echo -e "${YELLOW}Step 1: Backing up current configuration...${NC}"
if [ -f ".env" ]; then
    cp .env .env.backup-$(date +%Y%m%d-%H%M%S)
    echo -e "${GREEN}✓ Current .env backed up${NC}"
fi

echo -e "${YELLOW}Step 2: Creating new environment configuration...${NC}"
cat > .env.new << EOF
# Supabase Configuration - XP System
NEXT_PUBLIC_SUPABASE_URL=https://${NEW_PROJECT_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEW_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${NEW_SERVICE_KEY}

# Database
DATABASE_URL=postgresql://postgres:${NEW_DB_PASSWORD}@db.${NEW_PROJECT_URL}:5432/postgres
DIRECT_URL=postgresql://postgres:${NEW_DB_PASSWORD}@db.${NEW_PROJECT_URL}:5432/postgres

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development

# XP System Configuration
XP_MULTIPLIER_ENABLED=true
XP_DAILY_LIMIT=5000
XP_ACHIEVEMENT_NOTIFICATIONS=true
XP_SEASON_ACTIVE=false

# Feature Flags
ENABLE_XP_SYSTEM=true
ENABLE_ACHIEVEMENTS=true
ENABLE_LEADERBOARDS=true
ENABLE_DAILY_QUESTS=false

# Old system disabled
ENABLE_EARNINGS=false
ENABLE_STRIPE=false
EOF

echo -e "${GREEN}✓ Created .env.new file${NC}"

echo -e "${YELLOW}Step 3: Initializing Supabase CLI...${NC}"
if [ ! -d "supabase" ]; then
    npx supabase init
    echo -e "${GREEN}✓ Supabase initialized${NC}"
else
    echo -e "${GREEN}✓ Supabase already initialized${NC}"
fi

echo -e "${YELLOW}Step 4: Linking to new project...${NC}"
npx supabase link --project-ref ${PROJECT_REF}
echo -e "${GREEN}✓ Linked to project${NC}"

echo -e "${YELLOW}Step 5: Creating combined migration file...${NC}"
# Combine all necessary migrations into one
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_complete_xp_setup.sql << 'EOF'
-- =============================================
-- COMPLETE XP SYSTEM SETUP
-- =============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create auth schema tables if not exists
-- (Supabase handles this, but we ensure it's ready)

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    twitter_handle TEXT,
    tier TEXT DEFAULT 'newcomer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- XP specific fields
    display_level BOOLEAN DEFAULT true,
    display_achievements BOOLEAN DEFAULT true,
    favorite_achievement_id UUID,
    profile_theme TEXT DEFAULT 'default'
);

-- 2. TREND SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.trend_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    spotter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    source_url TEXT,
    screenshot_url TEXT,
    platform TEXT CHECK (platform IN ('twitter', 'instagram', 'tiktok', 'youtube', 'reddit', 'other')),
    ai_analysis JSONB,
    ai_angle TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approve_count INTEGER DEFAULT 0,
    reject_count INTEGER DEFAULT 0,
    skip_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    -- XP specific
    xp_awarded INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 1.0,
    is_viral BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VALIDATIONS TABLE
CREATE TABLE IF NOT EXISTS public.validations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
    validator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vote TEXT CHECK (vote IN ('verify', 'reject', 'skip')) NOT NULL,
    feedback TEXT,
    time_spent INTEGER, -- seconds spent validating
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trend_id, validator_id)
);

-- 4. SCROLL SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.scroll_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    trends_viewed INTEGER DEFAULT 0,
    trends_validated INTEGER DEFAULT 0,
    session_duration INTEGER DEFAULT 0, -- in seconds
    xp_earned INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

EOF

# Now append the XP migration content
cat supabase/migrations/20250820_xp_system_migration.sql >> supabase/migrations/$(date +%Y%m%d%H%M%S)_complete_xp_setup.sql

echo -e "${GREEN}✓ Migration file created${NC}"

echo -e "${YELLOW}Step 6: Running migrations...${NC}"
npx supabase db push
echo -e "${GREEN}✓ Migrations applied${NC}"

echo -e "${YELLOW}Step 7: Setting up storage buckets...${NC}"
cat > setup_storage.sql << 'EOF'
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, true, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    ('screenshots', 'screenshots', true, true, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('achievements', 'achievements', true, true, ARRAY['image/png', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view screenshots" ON storage.objects
    FOR SELECT USING (bucket_id = 'screenshots');

CREATE POLICY "Authenticated users can upload screenshots" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'screenshots' AND auth.uid() IS NOT NULL);
EOF

npx supabase db push --file setup_storage.sql
echo -e "${GREEN}✓ Storage buckets configured${NC}"

echo -e "${YELLOW}Step 8: Creating test data...${NC}"
cat > setup_test_data.sql << 'EOF'
-- Insert test achievements
INSERT INTO achievements (name, description, xp_reward, category, icon_url, requirements)
SELECT * FROM (VALUES
    ('First Steps', 'Submit your first trend', 50, 'submission', '🎯', '{"trends_submitted": 1}'::jsonb),
    ('Quick Validator', 'Complete a validation in under 10 seconds', 25, 'validation', '⚡', '{"quick_validation": true}'::jsonb),
    ('Weekend Warrior', 'Submit trends on Saturday and Sunday', 100, 'special', '🏖️', '{"weekend_activity": true}'::jsonb)
) AS v(name, description, xp_reward, category, icon_url, requirements)
WHERE NOT EXISTS (SELECT 1 FROM achievements);

-- Insert XP configuration
INSERT INTO xp_config (key, value)
VALUES ('welcome_bonus', '{"enabled": true, "amount": 100}'::jsonb)
ON CONFLICT (key) DO NOTHING;
EOF

npx supabase db push --file setup_test_data.sql
echo -e "${GREEN}✓ Test data created${NC}"

echo -e "${YELLOW}Step 9: Updating application configuration...${NC}"
# Update web package.json to ensure Supabase packages are installed
cd web
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
cd ..

# Update mobile package.json
cd mobile
npm install @supabase/supabase-js
cd ..

echo -e "${GREEN}✓ Dependencies updated${NC}"

echo ""
echo "========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Your new Supabase project is configured with the XP system."
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review the generated .env.new file"
echo "2. When ready to switch: cp .env.new .env"
echo "3. Restart your development server"
echo "4. Test the XP system thoroughly"
echo ""
echo -e "${YELLOW}Important files created:${NC}"
echo "  - .env.new (new configuration)"
echo "  - .env.backup-* (backup of old config)"
echo "  - supabase/migrations/*_complete_xp_setup.sql"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  View project: npx supabase dashboard"
echo "  Check status: npx supabase status"
echo "  View logs: npx supabase logs"
echo ""
echo -e "${GREEN}Project URL:${NC} https://${NEW_PROJECT_URL}"
echo -e "${GREEN}Dashboard:${NC} https://app.supabase.com/project/${PROJECT_REF}"
echo ""
echo "Remember to update your authentication providers in the Supabase dashboard!"

# Clean up temporary files
rm -f setup_storage.sql setup_test_data.sql