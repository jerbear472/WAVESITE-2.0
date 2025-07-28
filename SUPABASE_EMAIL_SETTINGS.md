# Supabase Email Confirmation Settings (Updated UI)

## Finding the Email Settings in Current Supabase Dashboard

### 1. Navigate to Auth Settings
- Go to your [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Click on **Settings** (gear icon) in the left sidebar
- Click on **Auth** under Configuration

### 2. Look for These Settings

In the **Auth Settings** page, scroll down to find:

**Email Auth** section:
- **Enable Email Signup** - Should be ON
- **Enable Email Confirmations** - Should be ON
- **Confirm Email** - Should be ENABLED

**User Signups** section:
- **Enable Signups** - Should be ON

### 3. Alternative Location - Auth Providers

If not in Settings:
- Go to **Authentication** in the left sidebar
- Click on **Providers**
- Click on **Email** 
- Look for confirmation settings there

### 4. If You Can't Find These Settings

The issue might be that Supabase is automatically logging in users. Let's fix this in the code instead:

**Update the Registration Flow:**