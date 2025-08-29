# Email Verification Setup for WaveSight

## ✅ Email Verification Flow Implemented

### 1. **Supabase Configuration**
Your Supabase project has email verification enabled. When users sign up, they receive an email with this template:

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
```

### 2. **Implementation Details**

#### Registration Flow (`/register`)
- User signs up with email and password
- `emailRedirectTo` is set to `${window.location.origin}/auth/callback`
- User receives confirmation email
- Shows "Check your email" message

#### Auth Callback Handler (`/auth/callback`)
The callback page now handles multiple authentication scenarios:

1. **Email Confirmation (with token_hash)**
   - Verifies the OTP token from email
   - Shows success message
   - Redirects to login page with `confirmed=true`

2. **OAuth/Magic Link (with code)**
   - Exchanges code for session
   - Redirects to dashboard or specified page

3. **Error Handling**
   - Shows error messages
   - Redirects to login with error details

#### Login Page (`/login`)
- Displays success message when `confirmed=true` parameter is present
- Shows: "Email confirmed successfully! You can now log in."

### 3. **Testing the Flow**

1. **Sign up a new user:**
   ```
   http://localhost:3000/register
   ```

2. **Check email for confirmation link**
   - The link will look like:
   ```
   http://localhost:3000/auth/callback?token_hash=xxx&type=signup
   ```

3. **Click the confirmation link**
   - Should see "Email confirmed successfully!"
   - Automatically redirects to login page

4. **Login with confirmed account**
   - Can now access protected routes

### 4. **Customizing the Email Template (Optional)**

To customize the email template in Supabase:

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Select "Confirm signup" template
3. Update the HTML/text as needed
4. Available variables:
   - `{{ .ConfirmationURL }}` - The confirmation link
   - `{{ .Email }}` - User's email
   - `{{ .Token }}` - Confirmation token

Example custom template:
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #3b82f6;">Welcome to WaveSight! 🌊</h1>
  <p>Thanks for signing up! Please confirm your email address to start spotting trends.</p>
  <div style="margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" 
       style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
      Confirm Email Address
    </a>
  </div>
  <p style="color: #666; font-size: 14px;">
    If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">
    You're receiving this email because you signed up for WaveSight. 
    If you didn't sign up, you can safely ignore this email.
  </p>
</div>
```

### 5. **Troubleshooting**

**Issue: Email not received**
- Check spam folder
- Verify SMTP settings in Supabase
- Check Supabase email logs (Dashboard → Logs → Auth)

**Issue: Confirmation link expired**
- Default expiry is 24 hours
- User needs to request new confirmation email
- Can be configured in Supabase settings

**Issue: "Invalid callback parameters" error**
- Check URL parameters are correct
- Ensure `emailRedirectTo` matches your domain
- Check browser console for detailed errors

### 6. **Security Considerations**

✅ **Implemented:**
- Token verification using Supabase's built-in OTP system
- Secure redirect after confirmation
- Error messages don't reveal sensitive information
- HTTPS required in production

⚠️ **Important:**
- Always use HTTPS in production
- Set proper redirect URLs in Supabase dashboard
- Configure allowed redirect URLs in Supabase

### 7. **Next Steps (Optional)**

1. **Add resend confirmation email feature**
2. **Implement email change confirmation**
3. **Add password reset flow**
4. **Set up custom domain for emails**
5. **Configure rate limiting for email sends**

## Summary

The email verification system is now fully functional with:
- ✅ Registration with email confirmation requirement
- ✅ Proper callback handling for confirmation links
- ✅ Success/error messaging
- ✅ Secure token verification
- ✅ User-friendly flow

Users must confirm their email before they can log in and access the application.