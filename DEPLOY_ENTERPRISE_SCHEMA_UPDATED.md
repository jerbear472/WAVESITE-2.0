# Deploy Enterprise Schema to Supabase - Updated

## Important: Foreign Key Fix

The previous error occurred because we tried to insert a profile for a non-existent user. The fixed schema now:
- ✅ Creates tables without sample user data
- ✅ Adds sample trends without user association (public trends)
- ✅ Provides a separate script to upgrade users after registration

## Quick Deployment Steps

### 1. Deploy the Schema

1. **Open Supabase SQL Editor**
   - Go to: https://app.supabase.com/project/achuavagkhjenaypawij/sql

2. **Copy and Run the Fixed Schema**
   - Copy ALL contents from: `supabase/complete_schema_fixed.sql`
   - Paste into SQL editor
   - Click "Run"
   - You should see success messages

### 2. Create Your First Enterprise User

1. **Register a New User** (via your app)
   ```
   http://localhost:3000/register
   ```
   Sign up with your email

2. **Upgrade User to Enterprise**
   - Go back to SQL Editor
   - Open: `supabase/upgrade_user_to_enterprise.sql`
   - Replace `'user@example.com'` with your actual email
   - Run the script

### 3. Verify Setup

Run this locally to check:
```bash
node deploy-enterprise-schema-simple.js
```

## What Gets Created

### Tables (Schema Only)
- ✅ `profiles` - User profiles with subscription tiers
- ✅ `enterprise_trends` - Enhanced trend data
- ✅ `api_keys` - API key management
- ✅ `enterprise_alerts` - Alert configurations
- ✅ `alert_notifications` - Alert history
- ✅ `export_jobs` - Export tracking
- ✅ `integrations` - Third-party integrations
- ✅ `analytics_cache` - Performance cache

### Sample Data
- 5 public enterprise trends (no user association)
- No user data (avoiding foreign key issues)

## Testing the Enterprise Dashboard

1. **Start Development Server**
   ```bash
   cd web
   npm run dev
   ```

2. **Access Dashboard**
   - Login with your upgraded user
   - Visit: http://localhost:3000/enterprise/dashboard

3. **Test API Access**
   Get your API key from the database:
   ```sql
   SELECT key FROM api_keys WHERE user_id = (
     SELECT id FROM profiles WHERE email = 'your-email@example.com'
   );
   ```

   Test the API:
   ```bash
   curl -X GET http://localhost:3000/api/v1/enterprise/trends \
     -H "X-API-Key: your_api_key_here" \
     -H "Content-Type: application/json"
   ```

## Troubleshooting

### "Foreign key constraint" Error
- This is fixed in the updated schema
- Make sure you're using `complete_schema_fixed.sql`

### "User not authorized" on Dashboard
- Ensure user's subscription_tier is set correctly:
  ```sql
  SELECT email, subscription_tier FROM profiles;
  ```
- Update if needed:
  ```sql
  UPDATE profiles 
  SET subscription_tier = 'enterprise' 
  WHERE email = 'your-email@example.com';
  ```

### Cannot See Trends
- Check if trends exist:
  ```sql
  SELECT COUNT(*) FROM enterprise_trends;
  ```
- Sample trends should be created automatically

## Managing Subscription Tiers

```sql
-- View all users and their tiers
SELECT email, subscription_tier, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- Upgrade specific user
UPDATE profiles 
SET subscription_tier = 'professional' -- or 'enterprise', 'hedge_fund'
WHERE email = 'user@example.com';

-- Downgrade to starter
UPDATE profiles 
SET subscription_tier = 'starter'
WHERE email = 'user@example.com';
```

## Next Steps

1. **Payment Integration**
   - Set up Stripe for subscription management
   - Automate tier upgrades on payment

2. **Email Notifications**
   - Configure SendGrid/Resend for alert emails
   - Set up alert triggers

3. **Production Deployment**
   - Set up environment variables
   - Configure production database
   - Enable additional security

## Support

Check logs if issues persist:
- Supabase Dashboard → Logs → Database
- Browser console for frontend errors
- Network tab for API errors