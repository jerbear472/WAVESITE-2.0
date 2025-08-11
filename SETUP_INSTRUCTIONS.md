# Setup Instructions for Fresh Supabase Instance

## Current Status ✅
1. **Database Schema**: Created and running (FRESH_START_SCHEMA.sql executed)
2. **Environment Variables**: Configured in .env and web/.env.local
3. **Test Users**: Created but need email confirmation
4. **Application**: Running on http://localhost:3001

## Required Actions

### 1. Fix RLS Policies (REQUIRED)
Run the following in your Supabase SQL Editor:

```sql
-- File: FINAL_RLS_FIX.sql
-- This fixes the trend submission RLS policy issue
```

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `FINAL_RLS_FIX.sql`
4. Click **Run**

### 2. Configure Email Confirmation (Choose One)

#### Option A: Disable Email Confirmation (Development)
1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Under **Settings**, disable "Enable email confirmations"

#### Option B: Use Magic Link (Recommended)
1. Check the confirmation emails sent to test accounts
2. Click the confirmation link in the email

### 3. Test the Application

After completing the above steps, you can:

1. **Login**: http://localhost:3001/login
   - Email: `john.doe.1754889053@gmail.com`
   - Password: `TestPassword123!`

2. **Submit Trends**: http://localhost:3001/submit
   - Upload screenshots
   - Add trend descriptions
   - Earn $1.00 per submission

3. **Validate Trends**: http://localhost:3001/validate
   - Vote on submitted trends
   - Earn $0.10 per validation

4. **View Earnings**: http://localhost:3001/earnings
   - Track your earnings
   - Request cashouts

## Test Users Created

| Email | Password | Role |
|-------|----------|------|
| john.doe.1754889053@gmail.com | TestPassword123! | Spotter |
| jane.smith.1754889056@gmail.com | TestPassword123! | Validator |

## Files Reference

- `FRESH_START_SCHEMA.sql` - Complete database schema ✅
- `FINAL_RLS_FIX.sql` - RLS policy fixes (needs to be run)
- `test-complete-flow.js` - Automated testing script
- `web/lib/EARNINGS_STANDARD.ts` - Single source of truth for earnings

## Troubleshooting

### "Email not confirmed" Error
- Go to Authentication settings in Supabase
- Disable email confirmation for development
- Or check email for confirmation link

### "Cannot submit trends" Error
- Run FINAL_RLS_FIX.sql in SQL Editor
- Ensure you're logged in

### Numeric Overflow Errors
- Already fixed in FRESH_START_SCHEMA.sql
- Uses proper column types (BIGINT, INTEGER, DECIMAL)

## Next Steps

1. Run `FINAL_RLS_FIX.sql` in Supabase SQL Editor
2. Configure email settings
3. Test the application flow
4. Start developing new features!

## Development Server

The app is currently running at: http://localhost:3001

To restart if needed:
```bash
cd web
npm run dev
```