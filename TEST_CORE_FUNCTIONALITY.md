# WaveSight Core Functionality Test Checklist

## 🎯 Essential Features That Must Work

### 1. TREND SUBMISSION (/submit)

#### Pre-submission:
- [ ] User is logged in and authenticated
- [ ] Submit page loads without errors
- [ ] "Spot a Trend?" form appears

#### Submission Process:
- [ ] Paste a URL (TikTok, Instagram, YouTube, etc.)
- [ ] Click "Add Trend Details"
- [ ] Form opens with 4 steps visible

#### Step 1 - Basic Info:
- [ ] URL is pre-filled
- [ ] Trend name can be entered
- [ ] Explanation text area works
- [ ] Platform is auto-detected or selectable

#### Step 2 - Categorization:
- [ ] Categories are selectable (Fashion, Tech, etc.)
- [ ] Moods can be selected
- [ ] Spread speed options work (Emerging, Picking Up, Viral)

#### Step 3 - Demographics:
- [ ] Age ranges can be selected
- [ ] Subcultures can be chosen
- [ ] Region can be specified

#### Step 4 - Evidence:
- [ ] Screenshot can be uploaded
- [ ] Wave Score slider works (0-100)
- [ ] Submit button is enabled

#### After Submission:
- [ ] Success message appears
- [ ] "$0.10 earned" notification shows
- [ ] Redirects to timeline or shows confirmation
- [ ] Check database: trend appears in trend_submissions table

### 2. TREND VERIFICATION (/verify)

#### Pre-verification:
- [ ] User is logged in
- [ ] Verify page loads without errors
- [ ] Trends appear for validation

#### Validation Interface:
- [ ] Trend card shows all information:
  - [ ] Screenshot/thumbnail
  - [ ] Description
  - [ ] Category
  - [ ] Social metrics (if available)
  - [ ] Quality criteria checkmarks
  - [ ] Hours since posted

#### Voting Process:
- [ ] "Verify" button works (green)
- [ ] "Reject" button works (red)
- [ ] "Skip" button works
- [ ] Cannot vote on own trends
- [ ] Cannot vote twice on same trend

#### After Voting:
- [ ] Vote is recorded
- [ ] Next trend appears automatically
- [ ] Session counter increases
- [ ] "$0.01 earned" for each validation
- [ ] Stats update (validated today, earnings)

#### Vote Counting:
- [ ] Check database: vote appears in trend_validations
- [ ] approve_count increases for "verify" votes
- [ ] reject_count increases for "reject" votes
- [ ] After 2+ approvals, status changes to "approved"
- [ ] After 2+ rejects, status changes to "rejected"

### 3. EARNINGS TRACKING

#### For Submitters:
- [ ] $0.10 added to pending earnings on submission
- [ ] When trend approved: moves to approved earnings
- [ ] Profile shows correct total earnings

#### For Validators:
- [ ] $0.01 added per validation
- [ ] Daily earnings tracked correctly
- [ ] Total validations count increases

### 4. DATABASE INTEGRITY CHECKS

Run these queries in Supabase SQL Editor:

```sql
-- Check recent submissions
SELECT id, spotter_id, description, status, approve_count, reject_count, created_at
FROM trend_submissions
ORDER BY created_at DESC
LIMIT 5;

-- Check recent validations
SELECT tv.*, ts.description
FROM trend_validations tv
JOIN trend_submissions ts ON tv.trend_submission_id = ts.id
ORDER BY tv.created_at DESC
LIMIT 5;

-- Check vote counting is working
SELECT 
    id,
    description,
    status,
    approve_count,
    reject_count,
    validation_count
FROM trend_submissions
WHERE validation_count > 0
ORDER BY created_at DESC;

-- Check earnings (if profiles table exists)
SELECT 
    id,
    email,
    earnings_pending,
    earnings_approved,
    total_earnings,
    total_submissions,
    total_validations
FROM profiles
WHERE total_earnings > 0;
```

## 🔴 Critical Issues to Watch For

1. **"Column doesn't exist" errors** → Run ENSURE_CORE_FUNCTIONALITY.sql
2. **"Function cast_trend_vote does not exist"** → Run ENSURE_CORE_FUNCTIONALITY.sql
3. **"Permission denied" errors** → Check RLS policies
4. **Votes not counting** → Check triggers are working
5. **Can't see trends to validate** → Check RLS policies on trend_submissions
6. **Earnings not updating** → Check profiles table has earnings columns

## ✅ Success Criteria

The core functionality works when:
1. Users can submit trends and see them in the database
2. Other users can see and validate those trends
3. Votes are counted correctly
4. Status changes from submitted → approved/rejected after enough votes
5. Earnings are tracked for both submission ($0.10) and validation ($0.01)
6. No database errors in browser console
7. No "column ambiguous" or "function not found" errors

## 🚀 Quick Test Sequence

1. **Submit a trend:**
   - Go to /submit
   - Enter URL: https://www.tiktok.com/@test/video/123
   - Fill in basic info
   - Submit

2. **Validate trends:**
   - Go to /verify
   - Vote on 3-5 trends
   - Check earnings increased

3. **Verify in database:**
   - Run the SQL queries above
   - Confirm data is being stored correctly

## 📝 Notes

- The system requires at least 2 votes to approve/reject a trend
- Users cannot validate their own submissions
- Each validation earns $0.01
- Each submission earns $0.10 (pending until approved)
- The wave_score is a quality metric (0-100)