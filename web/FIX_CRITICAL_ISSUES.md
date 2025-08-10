# CRITICAL FIXES NEEDED FOR WAVESITE2

## 🔴 ISSUE 1: Fix Submit Page FormData Error

The submit page has a critical error where it references undefined `formData` variable.

### Location: 
`/web/app/(authenticated)/submit/page.tsx` lines 196-206

### Current Broken Code:
```javascript
const earningsData = {
  trendName: formData.get('name') as string,        // ❌ formData is undefined
  explanation: formData.get('description') as string,
  screenshot: formData.get('screenshot'),
  category: formData.get('category') as string,
};
```

### Fix Required:
```javascript
const earningsData = {
  trendName: trendData.trendName || submission.evidence?.title || 'Untitled',
  explanation: trendData.explanation || submission.description,
  screenshot: screenshotUrl || trendData.screenshot_url,
  category: displayCategory,
  platform: trendData.platform,
  url: trendData.url
};
```

## 🔴 ISSUE 2: Fix Vote Counting Mismatch

The database function requires 3 votes but the UI shows 2 votes needed.

### Location:
Database function `cast_trend_vote`

### Current Issue:
- UI shows: "2 approvals needed"
- Database requires: 3 votes to approve/reject

### SQL Fix Required:
```sql
-- Fix the cast_trend_vote function to use 2 votes instead of 3
CREATE OR REPLACE FUNCTION cast_trend_vote(
  p_trend_id UUID,
  p_vote TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote TEXT;
  v_verify_count INT;
  v_reject_count INT;
  v_trend_status TEXT;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- ... (rest of the function logic)
  
  -- UPDATE THIS PART:
  IF v_verify_count >= 2 THEN  -- Changed from 3 to 2
    UPDATE trend_submissions 
    SET status = 'approved',
        validation_count = v_verify_count + v_reject_count,
        approve_count = v_verify_count,
        reject_count = v_reject_count
    WHERE id = p_trend_id;
    
  ELSIF v_reject_count >= 2 THEN  -- Changed from 3 to 2
    UPDATE trend_submissions 
    SET status = 'rejected',
        validation_count = v_verify_count + v_reject_count,
        approve_count = v_verify_count,
        reject_count = v_reject_count
    WHERE id = p_trend_id;
  END IF;
  
  -- ... (rest of the function)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🔴 ISSUE 3: Fix Validation Page Index Handling

### Location:
`/web/app/(authenticated)/validate/page.tsx` lines 369-373

### Current Issue:
Index calculation can cause out-of-bounds errors

### Fix Required:
```javascript
// Replace the current logic with:
setTrends(prev => {
  const filtered = prev.filter(t => t.id !== trendId);
  // If we removed the last item and we were viewing it, go back one
  if (currentIndex >= filtered.length && filtered.length > 0) {
    setCurrentIndex(filtered.length - 1);
  } else if (filtered.length === 0) {
    setCurrentIndex(0);
  }
  return filtered;
});
```

## 🟡 ISSUE 4: Database Column Name Consistency

### Problem:
Mixed use of `trend_id` vs `trend_submission_id` in different tables

### Solution:
Run this SQL to check and fix:

```sql
-- Check which columns exist
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('trend_id', 'trend_submission_id')
ORDER BY table_name, column_name;

-- If needed, rename columns for consistency
-- ALTER TABLE trend_validations 
-- RENAME COLUMN trend_id TO trend_submission_id;
```

## ✅ VERIFICATION STEPS

After applying these fixes:

1. **Test Submission Flow:**
   - Submit a new trend
   - Verify it appears in the database
   - Check earnings are calculated correctly

2. **Test Validation Flow:**
   - Log in as different user
   - See the trend in validation page
   - Vote on it
   - Verify it requires exactly 2 votes to approve/reject

3. **Test Edge Cases:**
   - Last trend in validation queue
   - Empty validation queue
   - User with no remaining trends to validate

## 🚀 QUICK FIX COMMANDS

```bash
# 1. Fix the submit page
cd /Users/JeremyUys_1/Desktop/WAVESITE2/web
# Edit the file manually or use the fixes above

# 2. Apply database fixes
# Go to Supabase SQL editor and run the vote count fix

# 3. Test the complete flow
npm run dev
# Navigate to http://localhost:3000/submit
# Then test http://localhost:3000/validate
```

## 📋 CHECKLIST

- [ ] Fix formData error in submit page
- [ ] Update cast_trend_vote to use 2 votes
- [ ] Fix validation page index handling
- [ ] Test complete submission flow
- [ ] Test complete validation flow
- [ ] Verify 2-vote threshold works
- [ ] Check no console errors
- [ ] Ensure thumbnails display when available