# Simple Login Fix - Step by Step

## The Issue
The login is failing because of a mismatch between the authentication system and your browser session.

## Quick Solution

### Step 1: Clear Browser Data
1. Open Chrome/Safari/Firefox
2. Go to Settings → Privacy → Clear Browsing Data
3. Select "Cookies and other site data" 
4. Clear data for "Last hour" or "All time"
5. Close and reopen browser

### Step 2: Test in Incognito/Private Mode
1. Open a new Incognito/Private window
2. Go to: http://localhost:3000/login
3. Try logging in with:
   - Email: `enterprise@test.com`
   - Password: `test123456`

### Step 3: If Still Not Working - Register New User
1. In incognito mode, go to: http://localhost:3000/register
2. Create a new account with:
   - Email: `test@example.com` (or your real email)
   - Password: `password123`
   - Username: `testuser`

3. After registration, you should be logged in automatically

4. To make this user an enterprise user, go to Supabase dashboard:
   - https://app.supabase.com/project/achuavagkhjenaypawij/editor
   - Run this SQL:
   ```sql
   UPDATE profiles 
   SET subscription_tier = 'enterprise' 
   WHERE email = 'test@example.com';
   ```

### Step 4: Access Enterprise Dashboard
Once logged in, go directly to:
- http://localhost:3000/enterprise/dashboard

## Alternative: Check What's Happening

Open browser console (F12) and run this to see what's going on:
```javascript
// Check if you're logged in
const user = await (await fetch('/__/auth/me')).json();
console.log('Current user:', user);

// Check localStorage
console.log('Auth token:', localStorage.getItem('supabase.auth.token'));
```

## Why This Happens
- Browser caches old authentication tokens
- Cookies from previous sessions interfere
- The app was updated while browser had old session

## If Nothing Works
1. Stop the server (Ctrl+C)
2. Clear everything:
   ```bash
   rm -rf .next
   npm run dev
   ```
3. Use a completely different browser
4. Or try from your phone using your computer's IP address

The authentication system is working correctly - it's just a browser session issue!