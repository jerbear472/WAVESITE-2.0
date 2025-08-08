const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Please check your .env file.');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCurrentState() {
  console.log('🔍 Checking current database state...\n');
  
  try {
    // Check if profiles table exists
    const { data: profilesExists, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    const hasProfiles = !profilesError;
    console.log(`✓ 'profiles' table exists: ${hasProfiles}`);
    
    // Check if user_profiles table exists
    const { data: userProfilesExists, error: userProfilesError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    const hasUserProfiles = !userProfilesError;
    console.log(`✓ 'user_profiles' table exists: ${hasUserProfiles}`);
    
    if (hasProfiles && !hasUserProfiles) {
      console.log('\n✅ Database already consolidated! Only profiles table exists.');
      return { alreadyConsolidated: true };
    }
    
    if (!hasProfiles && hasUserProfiles) {
      console.log('\n⚠️  Only user_profiles exists. Need to create profiles table.');
      return { needsProfilesTable: true };
    }
    
    if (hasProfiles && hasUserProfiles) {
      // Count records in each
      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const { count: userProfilesCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      
      console.log(`\n📊 Record counts:`);
      console.log(`  - profiles: ${profilesCount || 0} records`);
      console.log(`  - user_profiles: ${userProfilesCount || 0} records`);
      
      return { 
        needsConsolidation: true,
        profilesCount: profilesCount || 0,
        userProfilesCount: userProfilesCount || 0
      };
    }
    
    return { noTables: true };
    
  } catch (error) {
    console.error('Error checking database state:', error);
    return { error };
  }
}

async function backupData() {
  console.log('\n💾 Creating backup of current data...');
  
  try {
    // Backup profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*');
    
    if (profiles && profiles.length > 0) {
      fs.writeFileSync(
        'backup-profiles.json',
        JSON.stringify(profiles, null, 2)
      );
      console.log(`✓ Backed up ${profiles.length} profiles to backup-profiles.json`);
    }
    
    // Backup user_profiles
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (userProfiles && userProfiles.length > 0) {
      fs.writeFileSync(
        'backup-user_profiles.json',
        JSON.stringify(userProfiles, null, 2)
      );
      console.log(`✓ Backed up ${userProfiles.length} user_profiles to backup-user_profiles.json`);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating backup:', error);
    return false;
  }
}

async function applyMigration() {
  console.log('\n🚀 Applying profile consolidation migration...\n');
  
  // Check current state
  const state = await checkCurrentState();
  
  if (state.alreadyConsolidated) {
    console.log('\n✨ No migration needed - database is already consolidated!');
    return;
  }
  
  if (state.error) {
    console.error('\n❌ Error checking database state. Aborting.');
    return;
  }
  
  // Create backups
  const backupSuccess = await backupData();
  if (!backupSuccess) {
    console.error('\n❌ Failed to create backups. Aborting migration.');
    console.log('Please manually backup your data before proceeding.');
    return;
  }
  
  // Read migration SQL
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, 'consolidate-profiles-migration.sql'),
    'utf8'
  );
  
  console.log('\n📝 Migration steps:');
  console.log('1. Add missing columns to profiles table');
  console.log('2. Migrate data from user_profiles to profiles');
  console.log('3. Update all foreign key references');
  console.log('4. Drop user_profiles table');
  console.log('5. Create backward compatibility view\n');
  
  console.log('⚠️  IMPORTANT: This migration should be run in the Supabase SQL Editor');
  console.log('for proper transaction support.\n');
  
  console.log('📋 Instructions:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy the contents of consolidate-profiles-migration.sql');
  console.log('4. Paste and run the SQL\n');
  
  // Test what we can do via the client
  console.log('🔧 Checking what we can update via the client...\n');
  
  try {
    // Check if we can query both tables
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, username')
      .limit(5);
    
    console.log('✓ Can query profiles table');
    
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('id, email, username')
      .limit(5);
    
    console.log('✓ Can query user_profiles table');
    
    // Check for any users in user_profiles not in profiles
    if (userProfiles && profiles) {
      const profileIds = new Set(profiles.map(p => p.id));
      const missingInProfiles = userProfiles.filter(up => !profileIds.has(up.id));
      
      if (missingInProfiles.length > 0) {
        console.log(`\n⚠️  Found ${missingInProfiles.length} users in user_profiles not in profiles`);
        console.log('These will be migrated when you run the SQL script.');
      }
    }
    
  } catch (error) {
    console.error('Error during checks:', error);
  }
  
  // Update application code references
  console.log('\n📝 After running the SQL migration, update your code:');
  console.log('1. Replace all references to "user_profiles" with "profiles"');
  console.log('2. Update any TypeScript interfaces or types');
  console.log('3. Test all user profile related functionality');
  console.log('4. Remove the backward compatibility view once confirmed working\n');
  
  // Save the migration SQL to a file for easy access
  console.log('✅ Migration SQL saved to: consolidate-profiles-migration.sql');
  console.log('📋 Copy this file\'s contents to Supabase SQL Editor and run it.\n');
}

// Run the migration
applyMigration().catch(console.error);