# Deploy Enhanced Voting System - Step by Step

## ✅ Deployment Status

- [x] **Verify page updated** - The enhanced verification page has been deployed
- [ ] **Database migration** - Needs to be run via Supabase dashboard
- [ ] **Server restart** - Needs to be done after migration

## Step 1: Apply Database Migration via Supabase Dashboard

Since we need the Supabase service role key for automated migration, you'll need to apply the migration manually:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project (achuavagkhjenaypawij)

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Run the Migration**
   - Open the file: `/supabase/migrations/20250729_enhanced_voting_system.sql`
   - Copy the entire contents
   - Paste into the SQL editor
   - Click "Run" button

4. **Verify Migration Success**
   - Check for any error messages
   - The migration handles existing objects gracefully
   - You should see "Success. No rows returned" for most statements
   - Some statements may show "already exists" warnings - this is normal

## Step 2: Update the Verify Page ✅ COMPLETED

The enhanced verify page has been deployed:
- Original backed up to: `page.backup-20250728-191750.tsx`
- Enhanced version now active at: `/app/(authenticated)/verify/page.tsx`

## Step 3: Start the Development Server

Run the following command in the web directory:

```bash
cd /Users/JeremyUys_1/Desktop/wavesite2/web
npm run dev
```

The server will start on http://localhost:3000

## Step 4: Test the Enhanced Features

1. **Navigate to the Verify Page**
   - Go to http://localhost:3000/verify
   - You should see the enhanced interface with:
     - Confidence slider
     - Rate limit display
     - Enhanced stats with reputation
     - Skip button
     - Similar trends sidebar

2. **Test New Features**
   - Try adjusting confidence with slider or keys 1-5
   - Check keyboard shortcuts (← → ↓)
   - Add optional reasoning
   - View real-time consensus (if votes exist)

3. **Verify Database Features**
   - Rate limiting should show remaining validations
   - Stats should show reputation score
   - Expertise level badge should appear

## Troubleshooting

### If you see database errors:
1. Make sure the migration was applied successfully
2. Check that all new tables were created:
   - `validator_expertise`
   - `validation_rate_limits`
   - `quality_control_trends`
   - `validator_performance_metrics`

### If features aren't working:
1. Clear browser cache and cookies
2. Check browser console for errors
3. Ensure you're logged in with a valid user
4. Try creating a new test user

### To rollback if needed:
```bash
cd /Users/JeremyUys_1/Desktop/wavesite2/web/app/(authenticated)/verify
cp page.backup-20250728-191750.tsx page.tsx
```

## Next Steps

After successful deployment:
1. Monitor for any issues
2. Collect user feedback on new features
3. Adjust rate limits and thresholds as needed
4. Consider implementing the ML pre-filtering service