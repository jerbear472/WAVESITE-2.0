# Supabase Authentication Configuration

## Required Settings in Supabase Dashboard

### 1. Site URL Configuration
Go to Authentication > URL Configuration in your Supabase dashboard and set:

- **Site URL**: `https://wavesight.app`

### 2. Redirect URLs
Add these URLs to the "Redirect URLs" allowlist:

```
https://wavesight.app/**
https://wavesight.app/auth/callback
https://wavesight.app/login
https://wavesight.app/dashboard
https://wavesight.app/predictions
http://localhost:3000/**
```

### 3. Email Templates
Ensure your email confirmation template uses the correct redirect URL:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
```

### 4. Auth Settings
In Authentication > Settings:

- Enable email confirmations if desired
- Set the JWT expiry appropriately (default is fine)
- Enable "Secure email change" if needed

## Environment Variables in Vercel

Make sure these are set in your Vercel project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=https://aicahushpcslwjwrlqbo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg4NzU1NCwiZXhwIjoyMDcwNDYzNTU0fQ.vqOYqTg_g1i1BHDGX5P1qpW7VN2c8uuBKx7SZHYG8lM
NEXT_PUBLIC_SITE_URL=https://wavesight.app
```

## Testing the Configuration

1. Visit: https://wavesight.app/test-auth
2. Check all the connection statuses
3. Try logging in with a test account

## Common Issues and Solutions

### "Load Failed" Error
- Check that environment variables are set in Vercel
- Verify Supabase URL is correct
- Check browser console for CORS errors

### "Invalid login credentials"
- Verify the user exists in Supabase Auth
- Check if email confirmation is required
- Ensure password is correct

### Redirect Issues
- Make sure redirect URLs are whitelisted in Supabase
- Verify Site URL is set correctly
- Check that auth callback page is working

### CORS Errors
- Ensure your domain is allowed in Supabase
- Check that the Supabase URL is correct
- Verify anon key has proper permissions