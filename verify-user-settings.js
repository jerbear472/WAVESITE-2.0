#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('\n📝 Manual verification steps:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Run this query to check current columns:\n');
  console.log(`
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;
  `);
  console.log('\n3. If missing columns, run add-user-settings-columns.sql');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyUserSettings() {
  console.log('🔍 Verifying user settings configuration...\n');
  console.log('=' .repeat(60));

  try {
    // Test query to check if columns exist
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, website, notification_preferences, privacy_settings, theme, language, role, updated_at')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Missing columns detected!\n');
        console.log('The following columns are missing from the users table:');
        
        const missingColumns = [];
        const testColumns = ['website', 'notification_preferences', 'privacy_settings', 'theme', 'language', 'role', 'updated_at'];
        
        for (const col of testColumns) {
          if (error.message.includes(col)) {
            missingColumns.push(col);
            console.log(`  • ${col}`);
          }
        }
        
        console.log('\n🔧 TO FIX THIS:');
        console.log('1. Go to Supabase Dashboard > SQL Editor');
        console.log('2. Copy the contents of add-user-settings-columns.sql');
        console.log('3. Run the SQL query');
        console.log('\nThis will add all missing columns with proper defaults.');
        
      } else {
        console.log('❌ Error checking columns:', error.message);
      }
    } else {
      console.log('✅ All required columns exist!\n');
      console.log('Settings structure verified:');
      console.log('  ✓ website - for personal website URL');
      console.log('  ✓ notification_preferences - email, push, trends, earnings');
      console.log('  ✓ privacy_settings - profile visibility, earnings display');
      console.log('  ✓ theme - light, dark, or system');
      console.log('  ✓ language - user language preference');
      console.log('  ✓ role - user role (user, admin, manager, moderator)');
      console.log('  ✓ updated_at - timestamp for last update');
      
      // Check if we have any users with settings
      const { data: usersWithSettings, error: countError } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .not('notification_preferences', 'is', null);
        
      if (!countError && usersWithSettings) {
        console.log(`\n📊 Users with saved settings: ${usersWithSettings.length}`);
      }
    }

    // Check RLS policies
    console.log('\n' + '=' .repeat(60));
    console.log('🔐 RLS Policy Check');
    console.log('=' .repeat(60));
    
    console.log('\nRequired policies for settings to work:');
    console.log('  1. Users can update own profile');
    console.log('  2. Users can view own profile');
    console.log('  3. Public profiles are viewable (optional)');
    
    console.log('\nTo verify policies, run this in SQL Editor:');
    console.log(`
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
    `);

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📝 Summary');
  console.log('=' .repeat(60));
  
  console.log('\nFor settings to persist properly:');
  console.log('1. All columns must exist in the users table');
  console.log('2. RLS policies must allow users to update their own profile');
  console.log('3. The settings page must save to these columns');
  console.log('4. The settings page must load from these columns on mount');
  
  console.log('\n✅ After running add-user-settings-columns.sql:');
  console.log('   - Profile information will persist');
  console.log('   - Notification preferences will be saved');
  console.log('   - Privacy settings will be remembered');
  console.log('   - Theme and language choices will persist');
  console.log('   - All settings will load automatically on page visit');
}

verifyUserSettings().catch(console.error);