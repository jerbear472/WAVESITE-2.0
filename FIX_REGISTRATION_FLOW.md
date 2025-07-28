# Fix Registration Flow - Email Confirmation Loop

## The Issue
After registration, users are being redirected to a blank sign-in window instead of seeing the email confirmation message.

## Solution

### 1. Disable Auto Sign-in in Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **Providers** → **Email**
3. Find the setting: **"Confirm email"** - Make sure it's **ENABLED**
4. Find the setting: **"Auto confirm users"** - Make sure it's **DISABLED**
5. Save changes

### 2. Update Auth Settings (if needed)

In the same Email provider settings:
- **Enable email confirmations** = ON
- **Auto-confirm users** = OFF
- **Secure email change** = ON (optional but recommended)

### 3. The Flow Should Work Like This:

1. User fills out registration form
2. User clicks "Create Account"
3. User sees "Check Your Email!" message (already implemented)
4. User receives email and clicks confirmation link
5. User is redirected to `/auth/confirm` page
6. After confirmation, user is redirected to login with success message

### 4. Quick Test

1. Try registering with a new email
2. You should see the "Check Your Email!" screen (green checkmark)
3. Check your email
4. Click the confirmation link
5. You should be redirected to login with "Email confirmed successfully!" message

### 5. If Still Having Issues

Check these in Supabase Dashboard:

**Authentication → Settings**:
- Disable "Auto-confirm users" 
- Enable "Confirm email"

**Authentication → Templates → Confirm signup**:
Make sure the template uses the correct variables:
```
{{ .SiteURL }}/auth/confirm#token_hash={{ .TokenHash }}&type=email
```

### 6. Alternative Quick Fix

If you need users to access the app immediately without email confirmation:

1. In Supabase Dashboard → Authentication → Providers → Email
2. Set "Auto-confirm users" = ON
3. This will skip email confirmation entirely

But for production, email confirmation is recommended for security.