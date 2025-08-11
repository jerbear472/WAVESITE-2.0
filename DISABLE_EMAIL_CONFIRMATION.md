# Disable Email Confirmation (For Testing)

If signups are failing because of email confirmation requirements, you need to:

## In Supabase Dashboard:

1. Go to **Authentication** → **Providers** → **Email**
2. Look for **"Confirm email"** setting
3. **DISABLE** it (uncheck the box)
4. Click **Save**

This will allow users to sign up and immediately access their account without email verification.

## For Production:

You can re-enable email confirmations later once everything is working. For now, disabling it helps test the signup flow.

## Alternative: Update Auth Settings via SQL

If you prefer, you can also check the current settings:

```sql
-- Check current auth settings
SELECT * FROM auth.config WHERE key = 'email_confirmation_required';
```

Note: Email confirmation settings are usually managed through the Supabase dashboard, not SQL.