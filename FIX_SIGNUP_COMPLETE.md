# Complete Fix for New User Sign Up

## Issues Identified and Fixed:

### 1. Database Schema Mismatch
- **Issue**: Web app expects `profiles` table but database has `user_profiles`
- **Fix**: Created SQL script to add compatibility view and missing fields

### 2. Missing Birthday Field in Mobile App
- **Issue**: Mobile app registration didn't collect birthday (required for age verification)
- **Fix**: Updated mobile app to use the existing `RegisterScreenWithBirthday.tsx`

### 3. Missing Database Tables
- **Issue**: `user_settings` and `user_account_settings` tables referenced but not created
- **Fix**: Added table creation in SQL script

## Steps to Apply the Fix:

### Step 1: Apply Database Updates
Run the SQL script in your Supabase SQL Editor:

```bash
# Go to https://app.supabase.com
# Select your project
# Go to SQL Editor
# Create new query
# Copy and paste the contents of: fix-signup-issues.sql
# Click "Run"
```

### Step 2: Update Mobile App Navigation
In `/mobile/src/navigation/AuthNavigator.tsx`, ensure it imports the correct RegisterScreen:

```typescript
import { RegisterScreen } from '../screens/RegisterScreenWithBirthday';
```

### Step 3: Verify Supabase Email Settings
1. Go to Supabase Dashboard → Authentication → Providers → Email
2. Ensure these settings:
   - **Enable Email Signup**: ON
   - **Confirm email**: ON (for production)
   - **Auto-confirm users**: OFF (for production)

For testing, you can temporarily set:
- **Auto-confirm users**: ON (to skip email confirmation)

### Step 4: Set Redirect URLs
In Supabase Dashboard → Authentication → URL Configuration:

**Site URL**: 
- Development: `http://localhost:3000`
- Production: `https://your-domain.vercel.app`

**Redirect URLs** (add all):
```
http://localhost:3000
http://localhost:3000/login
http://localhost:3000/dashboard
https://your-domain.vercel.app
https://your-domain.vercel.app/login
https://your-domain.vercel.app/dashboard
```

## Testing the Fix:

### 1. Test Web Registration:
```bash
cd web
npm run dev
# Go to http://localhost:3000/register
# Create a new account with all fields including birthday
```

### 2. Test Mobile Registration:
```bash
cd mobile
npm run ios  # or npm run android
# Navigate to Register screen
# Create account with birthday field
```

### 3. Verify User Creation:
Run this SQL in Supabase to check:
```sql
SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 5;
SELECT * FROM public.user_profiles ORDER BY created_at DESC LIMIT 5;
SELECT * FROM public.profiles ORDER BY created_at DESC LIMIT 5;
```

## Expected Behavior:

1. **Registration Flow**:
   - User fills all fields including birthday
   - Age validation ensures 18+ only
   - On submit, user sees "Check Your Email!" message
   - Email sent with confirmation link
   - User clicks link → redirected to login
   - User can now sign in

2. **Database State**:
   - User created in `auth.users`
   - Profile created in `user_profiles` 
   - Profile visible in `profiles` view
   - Settings tables populated

## Troubleshooting:

### "Duplicate email" error:
- User already exists - try different email or delete existing

### Email not received:
- Check spam folder
- Verify SMTP settings in Supabase
- Try "Resend confirmation email" in Supabase Auth dashboard

### Profile not created:
- Check if trigger `on_auth_user_created` exists and is enabled
- Manually insert profile if needed

### Login fails after registration:
- Ensure email is confirmed
- Check `email_confirmed_at` is not null in auth.users

## Next Steps:

1. Deploy database changes
2. Test full registration flow
3. Monitor for any errors in Supabase logs
4. Consider adding:
   - Email verification resend
   - Password strength indicator
   - Username availability check
   - Social login options

The signup flow should now work properly for both web and mobile apps!