# Email Configuration for WaveSight

## Current Status
Email confirmation is **DISABLED** in your Supabase instance. This means:
- Users can sign up and immediately access their account
- No confirmation emails are sent
- Accounts are auto-confirmed upon registration

## Why You're Not Getting Emails

You're not receiving emails because:
1. **Email confirmation is disabled** - Users are auto-confirmed without needing to verify their email
2. **SMTP may not be configured** - Supabase needs SMTP settings to send emails

## How to Enable Email Notifications

### Option 1: Enable Email Confirmation (Recommended for Production)

1. Go to your Supabase Dashboard:
   https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo/auth/providers

2. Click on **Email** provider

3. Enable **"Confirm email"** option

4. Save the changes

### Option 2: Configure SMTP for Custom Emails

If you want to send emails from your own domain:

1. Go to: https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo/settings/auth

2. Scroll to **SMTP Settings**

3. Enable custom SMTP and add your email provider settings:
   - For Gmail: smtp.gmail.com, port 587
   - For SendGrid: smtp.sendgrid.net, port 587
   - For other providers, check their SMTP documentation

4. Add your SMTP username and password

5. Set the sender email address

### Option 3: Use Supabase Default Emails

If you just enable email confirmation without custom SMTP:
- Emails will be sent from `noreply@mail.app.supabase.io`
- They may end up in spam folders
- Limited customization options

## Testing Email Settings

Once you enable emails, test with:
1. Sign up with a real email address (not test@example.com)
2. Check spam/junk folders
3. Add supabase.io to your email whitelist

## For Development/Testing

If you want to keep emails disabled for development:
- Current setup is fine
- Users are auto-confirmed
- No email delays during testing

## Email Templates

To customize email templates:
1. Go to: https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo/auth/templates
2. Edit the confirmation email template
3. Add your branding and messaging