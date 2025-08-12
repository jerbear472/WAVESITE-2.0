# 🔧 Fix Settings Persistence

Your settings page is trying to save data to database columns that don't exist yet. This is why settings don't persist between sessions.

## ❌ Current Problem
The settings page saves these fields but they're missing from the database:
- `website` - Personal website URL
- `notification_preferences` - Email, push, trends, earnings notifications
- `privacy_settings` - Profile visibility, earnings display preferences  
- `theme` - Light/dark/system theme preference
- `language` - Language setting
- `role` - User role (for admin panel access)
- `updated_at` - Last update timestamp

## ✅ Solution

### Step 1: Add Missing Columns
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `add-user-settings-columns.sql`
5. Click **Run**

### Step 2: Verify It Worked
After running the SQL, test in your app:
1. Go to Settings page
2. Change some settings (bio, website, notifications, theme)
3. Click Save
4. Refresh the page or log out/in
5. **Your settings should now persist!** ✨

## 📊 What Gets Added

### New Columns
```sql
website TEXT                     -- Personal website URL
notification_preferences JSONB   -- {email, push, trends, earnings}
privacy_settings JSONB           -- {profile_public, show_earnings, show_trends}
theme TEXT                       -- 'light', 'dark', or 'system'
language TEXT                    -- Language preference
role TEXT                        -- User role for permissions
updated_at TIMESTAMPTZ          -- Auto-updates on changes
```

### Default Values
- Notifications: All enabled by default
- Privacy: Public profile, hide earnings, show trends
- Theme: System preference
- Language: English (en)
- Role: Regular user

### RLS Policies
The SQL also updates security policies so:
- ✅ Users can update their own profile
- ✅ Users can view their own profile
- ✅ Public profiles respect privacy settings

## 🧪 Testing Checklist

After applying the fix:
- [ ] Profile fields (username, bio, website) save and persist
- [ ] Avatar uploads work and persist
- [ ] Notification preferences save and persist
- [ ] Privacy settings save and persist
- [ ] Theme preference saves and persists
- [ ] Language setting saves and persists
- [ ] Settings load correctly when returning to the page
- [ ] Settings persist after logout/login

## 🚨 Troubleshooting

### If settings still don't save:
1. Check browser console for errors
2. Verify columns exist:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'users';
   ```

### If you get permission errors:
Run this to fix RLS policies:
```sql
-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

## 📝 Notes
- The `updated_at` field automatically updates whenever a user saves their profile
- All JSONB fields have sensible defaults so existing users won't break
- The theme field is constrained to valid values (light/dark/system)
- The role field enables admin panel access for admin/manager users