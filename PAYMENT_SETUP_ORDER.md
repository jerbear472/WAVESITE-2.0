# Payment System Setup - Correct Order

## Run these SQL scripts in Supabase in this exact order:

### 1. First - Create the payment system tables and functions
```sql
-- Run the main payment system setup
-- File: fix-payment-system.sql
```
This creates:
- `cashout_requests` table
- `payment_methods` table  
- All necessary functions and views
- RLS policies

### 2. Second - Add admin column (if you got the is_admin error)
```sql
-- Run the admin column fix
-- File: add-admin-column.sql
```
This adds:
- `is_admin` column to profiles
- Sets you as admin
- Updates admin check functions

### 3. Third - Fix the minimum cashout amount
```sql
-- Run the cashout minimum fix
-- File: fix-cashout-minimum.sql
```
This updates:
- Changes minimum from $10 to $5
- Updates validation function

## Quick Check Commands

After running the scripts, verify everything exists:

```sql
-- Check if tables exist
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'cashout_requests'
) as cashout_requests_exists;

-- Check if admin column exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'is_admin'
) as is_admin_exists;

-- Check your admin status
SELECT email, is_admin 
FROM profiles 
WHERE email = 'jeremyuys@gmail.com';
```

## If you get errors:

1. **"relation does not exist"** - Run the main `fix-payment-system.sql` first
2. **"column is_admin does not exist"** - Run `add-admin-column.sql` 
3. **"permission denied"** - Make sure you're logged in as the database owner

The scripts must be run in order because later scripts depend on tables/columns created by earlier ones.