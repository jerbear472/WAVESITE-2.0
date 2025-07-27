# Debug Submit Function - Step by Step

## What to Check When Testing

### 1. Open Browser Developer Tools
- Press F12 or right-click → "Inspect"
- Go to the **Console** tab
- Keep it open while testing

### 2. Test the Submit Button
1. Login to your app
2. Go to `/submit` page
3. Click "Submit New Trend" button
4. Fill out the form
5. Click final "Submit Trend" button
6. Watch the console for messages

### 3. Expected Console Messages
If working correctly, you should see:
```
Starting trend submission with data: {trendName: "...", url: "...", ...}
Submitting data to database: {spotter_id: "...", category: "...", ...}
Trend submitted successfully: {id: "...", ...}
```

### 4. Common Issues to Check

#### Issue A: User Not Logged In
**Console Error:** `Please log in to submit trends`
**Solution:** Make sure you're logged in and `user.id` exists

#### Issue B: Form Validation
**Console Error:** `Please fill in trend name, URL/screenshot, and explanation`
**Solution:** Complete all required form fields

#### Issue C: Database Permission Error
**Console Error:** `new row violates row-level security policy`
**Solution:** Run this SQL in Supabase:
```sql
-- Check if user exists in profiles table
SELECT id, email FROM public.profiles WHERE id = 'YOUR_USER_ID';

-- If user doesn't exist, create profile
INSERT INTO public.profiles (id, email, username) 
VALUES ('YOUR_USER_ID', 'your@email.com', 'username');
```

#### Issue D: Foreign Key Error
**Console Error:** `violates foreign key constraint`
**Solution:** The SQL script we ran should have fixed this

#### Issue E: Storage Bucket Error
**Console Error:** `Bucket not found: trend-images`
**Solution:** The function should auto-create this, but you can create it manually in Supabase Storage

### 5. Quick Test Without Form
If the form isn't working, test the function directly in browser console:

```javascript
// Open browser console on your submit page and run:
const testData = {
  trendName: "Test Trend",
  url: "https://tiktok.com/test",
  platform: "tiktok",
  explanation: "This is a test trend",
  ageRanges: ["Gen Z (15-24)"],
  categories: ["Humor & Memes"],
  moods: ["Funny 😂"],
  spreadSpeed: "picking_up",
  motivation: "Testing the system",
  firstSeen: "today",
  otherPlatforms: [],
  brandAdoption: false
};

// This will trigger the submit function
handleTrendSubmit(testData);
```

### 6. Check Database After Submit
In Supabase SQL Editor:
```sql
-- Check if the trend was saved
SELECT * FROM public.trend_submissions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check user's submissions
SELECT * FROM public.trend_submissions 
WHERE spotter_id = 'YOUR_USER_ID';
```

### 7. Form Flow Issues
If the form itself isn't working:
- Check if the form opens when you click "Submit New Trend"
- Make sure you can navigate through all 4 steps
- Verify the final submit button is enabled
- Check if validation errors appear

### 8. Network Issues
In Developer Tools → Network tab:
- Look for failed requests to Supabase
- Check if POST requests are being made
- Verify response status codes

## Quick Fixes

### Fix 1: Reset Form State
If form gets stuck, add this to browser console:
```javascript
localStorage.clear();
location.reload();
```

### Fix 2: Test with Minimal Data
Try submitting with just the required fields:
- Trend Name: "Test"
- URL: "https://example.com"
- Explanation: "Test"
- Age Range: Select one
- Category: Select one  
- Mood: Select one
- Spread Speed: Select one
- Motivation: "Test"

### Fix 3: Check User Authentication
In browser console:
```javascript
// Check if user is loaded
console.log('User:', user);
console.log('User ID:', user?.id);
```

Let me know what specific error messages you see in the console!