# 🔍 Debug Trend Submission Error on Vercel

Since `supabase` isn't globally accessible, let's debug the actual error:

## Method 1: Network Tab Debugging

1. **Open DevTools** (F12) on your Vercel site
2. Go to **Network** tab
3. Click **"Submit New Trend"** button
4. Paste a TikTok URL: `https://www.tiktok.com/@khaby.lame/video/7137423965982686469`
5. Fill required fields and submit
6. **Look for failed requests** (red entries) in Network tab
7. Click on the failed request
8. Check **Response** tab for error details

## Method 2: Console Error Capture

Run this before submitting:

```javascript
// Capture all errors
window.addEventListener('unhandledrejection', event => {
  console.error('🔴 Unhandled promise rejection:', event.reason);
  if (event.reason?.message) {
    console.error('Message:', event.reason.message);
  }
  if (event.reason?.code) {
    console.error('Code:', event.reason.code);
  }
});

// Monitor fetch requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('📡 Fetch request:', args[0]);
  try {
    const response = await originalFetch(...args);
    if (!response.ok) {
      const text = await response.clone().text();
      console.error('❌ Fetch failed:', response.status, text);
    }
    return response;
  } catch (error) {
    console.error('❌ Fetch error:', error);
    throw error;
  }
};

console.log('🎯 Error monitoring enabled. Now try submitting a trend.');
```

## Common Errors and Fixes

### Error: "relation 'trend_submissions' does not exist"
**Fix**: Run the SQL script in Supabase to create the table

### Error: "null value in column 'spotter_id'"
**Fix**: User not properly authenticated or profile missing

### Error: "violates row-level security policy"
**Fix**: RLS policies need adjustment or user profile missing

### Error: "Failed to fetch" or CORS error
**Fix**: 
1. Check Vercel environment variables are set
2. Ensure proxy route is deployed
3. Check Supabase URL is correct

## Method 3: Check Environment

Run this to see what's configured:

```javascript
// Check if environment variables are exposed
console.log('Checking environment...');
console.log('Supabase URL configured:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Key configured:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Check page metadata
const metaTags = document.querySelectorAll('meta');
metaTags.forEach(tag => {
  if (tag.name?.includes('env') || tag.content?.includes('supabase')) {
    console.log('Meta tag:', tag.name, tag.content);
  }
});
```

## What to Look For

The actual error will tell us exactly what's wrong:
- **403**: Authentication/RLS issue
- **404**: Table doesn't exist
- **500**: Server error (check column mismatch)
- **Network error**: Proxy/CORS issue

Share the specific error message you see, and I can provide the exact fix!