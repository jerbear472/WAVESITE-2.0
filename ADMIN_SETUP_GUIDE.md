# Admin Setup Guide for WaveSite

## Overview
This guide will help you set up your admin account and understand the user management system.

## Setting Up Your Admin Account

### Step 1: Run the Admin Setup SQL Script

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/achuavagkhjenaypawij
2. Navigate to the **SQL Editor**
3. Open the file `supabase/admin_setup.sql` 
4. **IMPORTANT**: Before running, modify these lines in the script:
   ```sql
   SELECT create_admin_user(
       'jeremy@wavesite.com',  -- Change this to YOUR email
       'AdminPass123!',        -- Change this to YOUR secure password
       'jeremy_admin'          -- Change this to YOUR username
   );
   ```
5. Copy and paste the entire contents into the SQL editor
6. Click "Run" to execute the script

This will:
- Add the 'client' role to the user role system
- Create admin-only database policies
- Set up your admin account
- Create an activity log table for audit trails
- Create a user management view

### Step 2: Access the Admin Dashboard

1. Go to http://localhost:3001/login
2. Log in with your admin credentials
3. Once logged in, you'll see "Admin" next to your name
4. Click on your profile menu in the top right
5. Select "Admin Dashboard" (only visible to admin users)

## Admin Dashboard Features

### User Management
- **View all users** with their roles, account types, and statistics
- **Filter users** by role, account type, or search by name/email
- **Edit user details** including:
  - Role (participant, validator, manager, client, admin)
  - Account Type (user or client)
  - Organization name
  - Active/Inactive status
- **Export user data** to CSV for reporting

### Role Definitions

#### User Roles:
- **Participant**: Basic user who can submit and view trends
- **Validator**: Can validate trend submissions from others
- **Manager**: Can manage trend categories and moderate content
- **Client**: Special role for business/client accounts
- **Admin**: Full system access and user management

#### Account Types:
- **User**: Regular platform users (trend spotters, validators)
- **Client**: Business accounts with access to analytics and reports

### Key Statistics Displayed
- Total Users
- Active Users
- Client Accounts
- Admin Count
- Trends Spotted per User
- Accuracy Scores

## Managing Users

### To Change a User's Role:
1. Find the user in the admin dashboard
2. Click the Edit (pencil) icon
3. Select the new role from the dropdown
4. Select account type (user/client)
5. Add organization name if applicable
6. Toggle active/inactive status
7. Click Save (checkmark)

### Client vs User Differentiation:
- **Clients** typically have:
  - Account type set to "client"
  - Organization name filled in
  - Access to business analytics (if implemented)
  - Different subscription tiers

- **Users** typically have:
  - Account type set to "user"
  - Focus on trend spotting and validation
  - Earning capabilities

## Security Features

- All admin actions are logged in the activity log
- Row Level Security (RLS) ensures only admins can modify user data
- Admin dashboard is only accessible to users with admin role
- Automatic redirect if non-admin tries to access /admin

## Next Steps

1. Create additional admin accounts as needed
2. Set up client accounts for your business partners
3. Configure subscription tiers for different access levels
4. Monitor user activity through the dashboard

## Troubleshooting

### Can't see Admin Dashboard link:
- Ensure your user role is set to 'admin' in the database
- Try logging out and back in
- Check browser console for errors

### Can't edit users:
- Verify you have admin role
- Check that RLS policies were created successfully
- Ensure you're logged in with the correct account

### Database errors:
- Run the admin_setup.sql script again
- Check Supabase logs for specific errors
- Verify all tables and policies were created

## Support
For additional help, check the Supabase logs or database structure in the SQL editor.