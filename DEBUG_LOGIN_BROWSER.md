# Debug Login Issue in Browser

## Quick Steps to Debug

### 1. Open Browser Developer Tools
1. Go to http://localhost:3000/login
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab

### 2. Clear Everything First
In the browser console, run:
```javascript
localStorage.clear();
sessionStorage.clear();
```

Then refresh the page (Cmd+R or Ctrl+R)

### 3. Try to Login
- Email: `enterprise@test.com`
- Password: `test123456`
- Click "Sign in"

### 4. Check for Errors
Look in the console for any red error messages. Common issues:

- **"Invalid login credentials"** - Wrong password
- **"relation 'user_profiles' does not exist"** - Table name issue
- **Network errors** - CORS or connection issues

### 5. Manual Test in Console
Open the browser console at http://localhost:3000/login and paste this:

```javascript
// Test Supabase connection
const { createClientComponentClient } = require('@supabase/auth-helpers-nextjs');
const supabase = createClientComponentClient();

// Test auth
async function testAuth() {
  console.log('Testing authentication...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'enterprise@test.com',
    password: 'test123456'
  });
  
  if (error) {
    console.error('Auth failed:', error);
  } else {
    console.log('Auth success:', data);
  }
}

testAuth();
```

## Alternative: Create New User

### Option 1: Register New Account
1. Go to http://localhost:3000/register
2. Create a new account with your email
3. Note down the email you used

### Option 2: Update New User to Enterprise
After registering, go to Supabase SQL Editor and run:
```sql
UPDATE profiles 
SET subscription_tier = 'enterprise' 
WHERE email = 'your-email@example.com';
```

### Option 3: Check What Users Exist
In Supabase SQL Editor:
```sql
-- List all profiles
SELECT id, email, username, subscription_tier 
FROM profiles 
ORDER BY created_at DESC;

-- Check specific user
SELECT * FROM profiles WHERE email = 'enterprise@test.com';
```

## Common Fixes

### Fix 1: Hard Reload
- Mac: Cmd+Shift+R
- Windows: Ctrl+Shift+F5

### Fix 2: Incognito Mode
Try in a private/incognito window to avoid cache issues

### Fix 3: Check Network Tab
1. Open Developer Tools (F12)
2. Go to Network tab
3. Try to login
4. Look for failed requests (red)
5. Click on them to see error details

## What Error Do You See?

Please check the browser console and let me know:
1. What error message appears when you try to login?
2. Are there any red errors in the console?
3. Does the network tab show any failed requests?

This will help me provide a specific fix!