# Fix Authentication Issues

## Problem
The Supabase project has strict email validation that's blocking registrations.

## Quick Fix Steps

### 1. Go to your Supabase Dashboard
Visit: https://supabase.com/dashboard/project/achuavagkhjenaypawij/auth/providers

### 2. Configure Email Provider Settings
- Click on "Email" under Auth Providers
- **DISABLE** "Confirm email" (uncheck the box)
- **DISABLE** any email domain restrictions
- Click "Save"

### 3. Check Auth Settings
Go to: https://supabase.com/dashboard/project/achuavagkhjenaypawij/auth/policies
- Make sure "Enable email confirmations" is OFF
- Check that there are no email domain restrictions

### 4. Alternative: Create Test User Manually
If the above doesn't work, create a user directly in Supabase:

1. Go to: https://supabase.com/dashboard/project/achuavagkhjenaypawij/auth/users
2. Click "Create user"
3. Use these credentials:
   - Email: `demo@wavesight.com`
   - Password: `DemoUser123!`
4. Click "Create user"

### 5. Test Login
Once you've done the above:
1. Go to http://localhost:3000/login
2. Try logging in with the demo credentials

## If Registration Still Doesn't Work

The app might be using email validation patterns. You can try using more realistic email addresses like:
- `john.doe@gmail.com`
- `jane.smith@outlook.com`
- `user@company.com`

## Backend API (Optional)

The backend API is optional for basic functionality. If you need it:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will run on http://localhost:8000