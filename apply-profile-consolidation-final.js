const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function consolidateProfiles() {
  console.log('Starting profile consolidation...\n');

  try {
    // Step 1: Check what user_profiles is (table or view)
    console.log('Step 1: Checking user_profiles status...');
    const { data: checkData, error: checkError } = await supabase.rpc('query_raw', {
      query: `
        SELECT 
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_name IN ('user_profiles', 'profiles')
        AND table_schema = 'public'
        ORDER BY table_name;
      `
    });

    if (checkError) {
      // If query_raw doesn't exist, try direct query
      const { data: tables, error: tablesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (!tablesError) {
        console.log('✓ profiles table exists');
      }

      // Check if user_profiles exists
      const { data: userProfiles, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (userProfilesError && userProfilesError.message.includes('does not exist')) {
        console.log('✓ user_profiles does not exist (good - already consolidated)');
        return;
      } else if (!userProfilesError) {
        console.log('⚠️  user_profiles exists - needs consolidation');
      }
    } else {
      console.log('Current status:');
      checkData?.forEach(row => {
        console.log(`  - ${row.table_name}: ${row.table_type}`);
      });
    }

    // Step 2: Run the consolidation SQL
    console.log('\nStep 2: Running consolidation...');
    const consolidationSQL = `
      BEGIN;

      -- Drop the view if it exists
      DROP VIEW IF EXISTS user_profiles CASCADE;

      -- Ensure profiles table has all columns
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'participant',
      ADD COLUMN IF NOT EXISTS demographics JSONB,
      ADD COLUMN IF NOT EXISTS interests JSONB,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS trends_spotted INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS accuracy_score DECIMAL(3,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS validation_score DECIMAL(3,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS birthday DATE,
      ADD COLUMN IF NOT EXISTS total_cashed_out DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
      CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
      CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
      CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

      COMMIT;
    `;

    // Execute consolidation
    const { error: consolidateError } = await supabase.rpc('exec_sql', {
      sql: consolidationSQL
    });

    if (consolidateError) {
      console.log('Note: exec_sql function may not exist. Consolidation may need to be run directly in Supabase dashboard.');
      console.log('Copy the SQL from complete-profile-consolidation.sql and run it in the SQL editor.');
    } else {
      console.log('✓ Consolidation SQL executed successfully');
    }

    // Step 3: Verify consolidation
    console.log('\nStep 3: Verifying consolidation...');
    
    // Count profiles
    const { count: profileCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`✓ Profiles table has ${profileCount} records`);
    }

    // Try to access user_profiles (should fail if properly consolidated)
    const { error: viewError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (viewError && viewError.message.includes('does not exist')) {
      console.log('✓ user_profiles successfully removed');
    } else if (!viewError) {
      console.log('⚠️  user_profiles still exists - may be a view for backward compatibility');
    }

    // Step 4: Check for orphaned auth users
    console.log('\nStep 4: Checking for orphaned auth users...');
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    if (authUsers && authUsers.users) {
      const authUserIds = authUsers.users.map(u => u.id);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id');
      
      const profileIds = profiles ? profiles.map(p => p.id) : [];
      const missingProfiles = authUserIds.filter(id => !profileIds.includes(id));
      
      if (missingProfiles.length > 0) {
        console.log(`⚠️  Found ${missingProfiles.length} auth users without profiles`);
        console.log('Creating missing profiles...');
        
        for (const userId of missingProfiles) {
          const user = authUsers.users.find(u => u.id === userId);
          if (user) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email,
                username: user.user_metadata?.username || user.email?.split('@')[0],
                created_at: user.created_at,
                updated_at: user.created_at,
                role: 'participant',
                is_active: true
              });
            
            if (!insertError) {
              console.log(`  ✓ Created profile for ${user.email}`);
            }
          }
        }
      } else {
        console.log('✓ All auth users have profiles');
      }
    }

    console.log('\n✅ Profile consolidation complete!');
    console.log('\nNext steps:');
    console.log('1. Update your application code to use "profiles" instead of "user_profiles"');
    console.log('2. Test all user-related functionality');
    console.log('3. Monitor for any errors related to profile access');

  } catch (error) {
    console.error('Error during consolidation:', error);
    process.exit(1);
  }
}

// Run the consolidation
consolidateProfiles();