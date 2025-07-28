# Fix Email Confirmation Link Issue

The email confirmation link is failing because Supabase needs to know where to redirect users after they confirm their email. Here's how to fix it:

## Steps to Fix:

### 1. Update Supabase Dashboard Settings

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `achuavagkhjenaypawij`
3. Navigate to **Authentication** → **URL Configuration**

### 2. Configure Redirect URLs

Add these URLs to the **Redirect URLs** whitelist:

**For Local Development:**
```
http://localhost:3000
http://localhost:3000/login
http://localhost:3000/dashboard
```

**For Production (Vercel):**
```
https://your-app-name.vercel.app
https://your-app-name.vercel.app/login
https://your-app-name.vercel.app/dashboard
```

Replace `your-app-name` with your actual Vercel domain.

### 3. Update Site URL

In the same section, set your **Site URL** to:
- For development: `http://localhost:3000`
- For production: `https://your-app-name.vercel.app`

### 4. Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Select **Confirm signup**
3. Update the template to include your app name and styling
4. Make sure the confirmation URL uses `{{ .SiteURL }}` variable

Example template:
```html
<h2>Confirm your email</h2>
<p>Welcome to WaveSight!</p>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email address</a></p>
```

### 5. Update Your App Code

I've already created the necessary pages for you:

- `/app/auth/confirm/page.tsx` - Handles email confirmation
- `/app/auth/callback/page.tsx` - Handles OAuth callbacks
- Updated `/app/login/page.tsx` - Shows success message after confirmation

### 6. Testing the Flow

1. Register a new user
2. Check your email for the confirmation link
3. Click the link - it should redirect to `/auth/confirm#token_hash=...&type=email`
4. The confirmation page will verify the email and redirect to login
5. You'll see a success message on the login page

### 7. Environment Variables (if needed)

If you're using a custom domain, add this to your `.env.local`:
```
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Troubleshooting

If the confirmation link still doesn't work:

1. **Check Supabase Logs**
   - Go to your Supabase dashboard
   - Check Authentication → Logs for any errors

2. **Verify URL Configuration**
   - Make sure your Site URL is set correctly
   - Ensure redirect URLs are whitelisted

3. **Test Locally**
   - Run your app locally: `npm run dev`
   - Try the confirmation with `http://localhost:3000` as the site URL

4. **Common Issues**
   - **"Cannot connect to server"** - Site URL not configured
   - **"Invalid token"** - Link expired or already used
   - **Redirect loop** - Check your auth middleware

### For Production Deployment

When deploying to Vercel:

1. Add your Vercel URL to Supabase redirect URLs
2. Update Site URL to your production domain
3. Ensure environment variables are set in Vercel dashboard

The email confirmation should now work properly!