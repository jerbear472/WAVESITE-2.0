# Setting Up New Supabase Project for XP System

## Step 1: Create New Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Name it something like `freewavesight-xp` or `freewavesight-v2`
4. Choose the same region as your current project for best performance
5. Generate a strong database password and save it securely

## Step 2: Initial Setup Script

Save this as `setup-new-supabase.sh` and run it:

```bash
#!/bin/bash

# Configuration
OLD_PROJECT_URL="your-old-project.supabase.co"
NEW_PROJECT_URL="your-new-project.supabase.co"
NEW_ANON_KEY="your-new-anon-key"
NEW_SERVICE_KEY="your-new-service-role-key"

echo "Setting up new Supabase project for XP system..."

# 1. Create new .env file for the new project
cat > .env.new << EOF
# New Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://${NEW_PROJECT_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEW_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${NEW_SERVICE_KEY}

# Database URL (get from Supabase dashboard)
DATABASE_URL=postgresql://postgres:[password]@db.${NEW_PROJECT_URL}:5432/postgres

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# XP System Configuration
XP_MULTIPLIER_ENABLED=true
XP_DAILY_LIMIT=5000
XP_ACHIEVEMENT_NOTIFICATIONS=true
EOF

echo "✓ Created .env.new file"

# 2. Initialize Supabase locally
npx supabase init

# 3. Link to new project
npx supabase link --project-ref ${NEW_PROJECT_URL}

echo "✓ Linked to new Supabase project"
```

## Step 3: Run Database Migrations

```bash
# Run all migrations in order
npx supabase db push
```

## Step 4: Core Schema Setup

Run this SQL in your new Supabase SQL editor:

```sql
-- =============================================
-- CORE SCHEMA FOR FREEWAVESIGHT XP
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create profiles table (simplified without earnings)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT,
    avatar_url TEXT,
    tier TEXT DEFAULT 'learning',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- XP specific fields
    display_level BOOLEAN DEFAULT true,
    display_achievements BOOLEAN DEFAULT true,
    favorite_achievement_id UUID
);

-- Create trends table (simplified)
CREATE TABLE IF NOT EXISTS public.trend_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    spotter_id UUID REFERENCES auth.users(id),
    description TEXT NOT NULL,
    source_url TEXT,
    screenshot_url TEXT,
    platform TEXT,
    ai_analysis JSONB,
    ai_angle TEXT,
    status TEXT DEFAULT 'pending',
    approve_count INTEGER DEFAULT 0,
    reject_count INTEGER DEFAULT 0,
    skip_count INTEGER DEFAULT 0,
    -- XP specific
    xp_awarded INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create validations table
CREATE TABLE IF NOT EXISTS public.validations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trend_id UUID REFERENCES trend_submissions(id),
    validator_id UUID REFERENCES auth.users(id),
    vote TEXT CHECK (vote IN ('verify', 'reject', 'skip')),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trend_id, validator_id)
);

-- Create scroll sessions table
CREATE TABLE IF NOT EXISTS public.scroll_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    trends_viewed INTEGER DEFAULT 0,
    session_duration INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Now run the XP migration
-- (Copy the entire content from 20250820_xp_system_migration.sql here)
```

## Step 5: Migrate Essential Data (Optional)

If you want to preserve some data from the old project:

```sql
-- Export from old project (run in old Supabase SQL editor)
COPY (
    SELECT id, username, email, avatar_url, tier, created_at
    FROM profiles
) TO '/tmp/profiles_export.csv' WITH CSV HEADER;

COPY (
    SELECT id, spotter_id, description, source_url, platform, created_at
    FROM trend_submissions
    WHERE created_at > NOW() - INTERVAL '30 days'
) TO '/tmp/trends_export.csv' WITH CSV HEADER;

-- Import to new project (after downloading and uploading CSVs)
COPY profiles(id, username, email, avatar_url, tier, created_at)
FROM '/tmp/profiles_export.csv' WITH CSV HEADER;

COPY trend_submissions(id, spotter_id, description, source_url, platform, created_at)
FROM '/tmp/trends_export.csv' WITH CSV HEADER;
```

## Step 6: Update Authentication

1. Go to Authentication settings in new Supabase project
2. Configure the same auth providers (Google, Email, etc.)
3. Set up the same redirect URLs
4. Copy over any custom email templates

## Step 7: Storage Buckets

Create the same storage buckets in the new project:

```sql
-- Run in SQL editor
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('screenshots', 'screenshots', true),
    ('achievements', 'achievements', true);
```

## Step 8: Update Application Code

```bash
# Backup current .env
cp .env .env.backup

# Use new environment
cp .env.new .env

# Update supabase client imports if needed
# The app should now connect to the new project
```

## Step 9: Test Everything

1. Create a test user account
2. Submit a test trend
3. Verify XP is awarded
4. Check validations work
5. Test achievements unlock
6. Verify leaderboards populate

## Step 10: Migration Checklist

- [ ] New project created in Supabase
- [ ] Environment variables updated
- [ ] Database schema migrated
- [ ] XP system tables created
- [ ] Authentication configured
- [ ] Storage buckets created
- [ ] RLS policies applied
- [ ] Edge functions deployed (if any)
- [ ] Test data verified
- [ ] XP calculations working
- [ ] Frontend connecting properly

## Parallel Running Strategy

Keep both projects running during transition:

1. **Week 1-2**: New project in development/testing
2. **Week 3**: Deploy to staging with new project
3. **Week 4**: Gradual user migration
4. **Month 2**: Fully switch over, archive old project

## Rollback Plan

If issues arise:
1. Switch back to old environment: `cp .env.backup .env`
2. Restart application
3. Old Supabase project remains intact

## Cost Considerations

- Run both projects temporarily (double cost)
- After migration complete, pause or delete old project
- New project stays in free tier if <500MB database

## Connection String Update

Update all references:

```javascript
// Old
const supabase = createClient(
  'https://old-project.supabase.co',
  'old-anon-key'
)

// New
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

## Monitoring

Set up monitoring for the new project:
1. Enable Supabase dashboard metrics
2. Set up error alerting
3. Monitor XP transaction logs
4. Track user migration progress