# Deploy Enterprise Schema to Supabase

## Quick Deployment Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to: https://app.supabase.com/project/achuavagkhjenaypawij/sql
   - Or navigate: Dashboard → SQL Editor

2. **Copy the Schema**
   - Open the file: `supabase/complete_schema.sql`
   - Copy the ENTIRE contents (Cmd+A, Cmd+C)

3. **Run the Schema**
   - Paste the SQL into the editor
   - Click the "Run" button
   - Wait for success message

4. **Verify Deployment**
   ```bash
   node deploy-enterprise-schema-simple.js
   ```

### Option 2: Using psql Command Line

```bash
# Using the DATABASE_URL from your .env file
psql "postgresql://postgres:[qIvwos-vujzy1-dopzeb]@db.achuavagkhjenaypawij.supabase.co:5432/postgres" -f supabase/complete_schema.sql
```

### Option 3: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref achuavagkhjenaypawij

# Run migrations
supabase db push
```

## What Gets Deployed

### New Tables
- `profiles` - User profiles with subscription tiers
- `enterprise_trends` - Enhanced trend data with AI metrics
- `api_keys` - API key management for enterprise access
- `enterprise_alerts` - Custom alert configurations
- `alert_notifications` - Alert history and notifications
- `export_jobs` - Data export tracking
- `integrations` - Third-party integration configs
- `analytics_cache` - Performance cache for analytics

### Features Added
- Row Level Security (RLS) policies
- Automatic timestamp triggers
- Performance indexes
- API key generation function
- Sample data for testing

### Test Data Created
- Demo user: `enterprise@wavesight.com` (enterprise tier)
- 5 sample trends with various metrics
- Demo API key: `ws_demo_1234567890abcdef`

## Post-Deployment Steps

1. **Update Environment Variables**
   Ensure your `.env.local` has:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://achuavagkhjenaypawij.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Test the Dashboard**
   ```bash
   cd web
   npm run dev
   ```
   Visit: http://localhost:3000/enterprise/dashboard

3. **Create Your First Enterprise User**
   - Sign up at `/register`
   - Update user's subscription_tier in Supabase dashboard:
     ```sql
     UPDATE profiles 
     SET subscription_tier = 'enterprise' 
     WHERE email = 'your-email@example.com';
     ```

## Troubleshooting

### "relation does not exist" Error
- Make sure you're running `complete_schema.sql` not just `enterprise_schema.sql`
- The complete schema includes base tables needed

### Permission Denied
- Ensure you're using the service role key for deployment
- Check that RLS policies are properly configured

### Cannot Access Dashboard
- Verify user has correct subscription_tier
- Check browser console for auth errors
- Ensure all environment variables are set

## API Testing

Test the enterprise API:
```bash
curl -X GET http://localhost:3000/api/v1/enterprise/trends \
  -H "X-API-Key: ws_demo_1234567890abcdef" \
  -H "Content-Type: application/json"
```

## Next Steps

1. Set up Stripe for subscription payments
2. Configure email service for alerts
3. Set up webhook endpoints for integrations
4. Deploy to production

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs → Database
2. Verify all tables exist: Dashboard → Table Editor
3. Test with the demo user first