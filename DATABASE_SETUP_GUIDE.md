# 🚀 Complete Database Setup Guide

## ⚠️ The Problem
Your database is missing the `users` table entirely, which is why settings can't be saved.

## ✅ The Solution

### Step 1: Run Complete Database Setup
1. Go to **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste **ALL** contents of `create-complete-database.sql`
5. Click **Run**

This will create:
- ✅ `users` table with all settings columns
- ✅ `trend_submissions` table with thumbnail support
- ✅ `trend_validations` table
- ✅ `trend_timeline` table
- ✅ `admin_users` table
- ✅ All necessary indexes and RLS policies
- ✅ Auto-update trigger for `updated_at`
- ✅ Auto-link trigger for new auth users

### Step 2: Verify Setup
After running the SQL, check that tables were created:

```sql
-- Run this query to verify
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see:
- users
- trend_submissions
- trend_validations
- trend_timeline
- admin_users

### Step 3: Link Existing Auth Users (if any)
If you already have users who signed up before creating the tables:

```sql
-- Link existing auth users to users table
INSERT INTO public.users (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

## 📊 What's Included

### Users Table
All columns needed for the settings page:
- Basic info: `email`, `username`, `display_name`, `bio`, `avatar_url`
- Settings: `website`, `theme`, `language`, `role`
- Preferences: `notification_preferences`, `privacy_settings`
- Stats: `wave_points`, `reputation_score`, `total_earnings`
- Timestamps: `created_at`, `last_active`, `updated_at`

### Default Values
- Notifications: All enabled
- Privacy: Public profile, hide earnings
- Theme: System preference
- Language: English
- Role: Regular user

### Security (RLS)
- Users can view and update their own profile
- Public profiles respect privacy settings
- Only authenticated users can submit trends
- Anyone can view trends and validations

## 🧪 Test It Works

1. **Sign up/Login** to your app
2. Go to **Settings** page
3. Update your profile:
   - Add username and bio
   - Set website URL
   - Upload avatar
   - Toggle notifications
   - Change theme
4. **Save** changes
5. **Refresh** the page
6. ✅ Your settings should persist!

## 🚨 Troubleshooting

### If you get "relation does not exist" errors:
The SQL didn't run completely. Try running it in smaller chunks.

### If settings still don't save:
Check browser console and look for the specific error message.

### Common Issues:
1. **RLS violation** - The policies weren't created. Re-run the RLS section.
2. **Column doesn't exist** - The table wasn't created properly. Drop and recreate.
3. **Permission denied** - Check your Supabase API keys are correct.

## 📝 Important Notes

1. The script uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times
2. New auth users will automatically get a users table entry
3. The `updated_at` field auto-updates on any change
4. All JSONB fields have sensible defaults

## ✨ After Setup

Your app will have:
- ✅ Persistent user settings
- ✅ Working profile management
- ✅ Avatar upload capability
- ✅ Notification preferences
- ✅ Privacy controls
- ✅ Theme switching
- ✅ Admin role support