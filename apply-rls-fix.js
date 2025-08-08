const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUnrestrictedTables() {
  console.log('🔐 Starting to fix unrestricted tables...\n');

  const tables = [
    'admin_cashout_queue',
    'alerts',
    'competitor_analysis',
    'competitor_content',
    'content_analytics',
    'creator_profiles',
    'daily_challenges',
    'engagement_events'
  ];

  try {
    // First, check current RLS status
    console.log('📊 Checking current RLS status...');
    const { data: currentStatus, error: statusError } = await supabase.rpc('get_rls_status', {
      table_names: tables
    }).single();

    if (statusError && statusError.code !== 'PGRST202') {
      console.log('⚠️  Could not check RLS status, continuing with fix...');
    }

    // Enable RLS on each table
    for (const table of tables) {
      console.log(`\n🔧 Processing table: ${table}`);
      
      try {
        // Enable RLS
        const { error: rlsError } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
        });

        if (rlsError) {
          console.log(`  ⚠️  RLS might already be enabled or error: ${rlsError.message}`);
        } else {
          console.log(`  ✅ RLS enabled on ${table}`);
        }

        // Drop existing policies to avoid conflicts
        const { error: dropError } = await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "Users can view their own ${table}" ON ${table};
                DROP POLICY IF EXISTS "Users can insert their own ${table}" ON ${table};
                DROP POLICY IF EXISTS "Users can update their own ${table}" ON ${table};
                DROP POLICY IF EXISTS "Users can delete their own ${table}" ON ${table};
                DROP POLICY IF EXISTS "Authenticated users can view ${table}" ON ${table};
                DROP POLICY IF EXISTS "Only admins can manage ${table}" ON ${table};
                DROP POLICY IF EXISTS "Anyone can view ${table}" ON ${table};`
        });

        // Apply appropriate policies based on table
        await applyTablePolicies(supabase, table);
        
      } catch (err) {
        console.error(`  ❌ Error processing ${table}:`, err.message);
      }
    }

    // Verify the fix
    console.log('\n\n📋 Verifying RLS status after fix...');
    const { data: verification, error: verifyError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .in('tablename', tables);

    if (verification) {
      console.log('\n✅ RLS Status Summary:');
      verification.forEach(table => {
        const status = table.rowsecurity ? '✓ SECURED' : '✗ STILL UNRESTRICTED';
        console.log(`  ${table.tablename}: ${status}`);
      });
    }

    console.log('\n\n🎉 RLS fix completed!');
    console.log('📝 Note: You may need to run the SQL script directly in Supabase SQL Editor for full effect.');
    console.log('   SQL script location: fix-unrestricted-tables.sql');

  } catch (error) {
    console.error('❌ Error fixing unrestricted tables:', error);
    process.exit(1);
  }
}

async function applyTablePolicies(supabase, table) {
  const policies = getPoliciesForTable(table);
  
  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error) {
        console.log(`  ⚠️  Policy might already exist or error: ${error.message}`);
      } else {
        console.log(`  ✅ Policy applied for ${table}`);
      }
    } catch (err) {
      console.log(`  ⚠️  Could not apply policy: ${err.message}`);
    }
  }
}

function getPoliciesForTable(table) {
  const policies = {
    'admin_cashout_queue': [
      `CREATE POLICY "Users can view their own cashout requests" ON ${table}
        FOR SELECT USING (auth.uid() = user_id OR EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        ));`,
      `CREATE POLICY "Only admins can manage cashout queue" ON ${table}
        FOR ALL USING (EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        ));`
    ],
    'alerts': [
      `CREATE POLICY "Users can view their own alerts" ON ${table}
        FOR SELECT USING (auth.uid() = user_id);`,
      `CREATE POLICY "Users can manage their own alerts" ON ${table}
        FOR ALL USING (auth.uid() = user_id);`
    ],
    'competitor_analysis': [
      `CREATE POLICY "Authenticated users can view competitor analysis" ON ${table}
        FOR SELECT USING (auth.role() = 'authenticated');`,
      `CREATE POLICY "Only admins can manage competitor analysis" ON ${table}
        FOR ALL USING (EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        ));`
    ],
    'competitor_content': [
      `CREATE POLICY "Authenticated users can view competitor content" ON ${table}
        FOR SELECT USING (auth.role() = 'authenticated');`,
      `CREATE POLICY "Only admins can manage competitor content" ON ${table}
        FOR ALL USING (EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        ));`
    ],
    'content_analytics': [
      `CREATE POLICY "Users can view their own content analytics" ON ${table}
        FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);`,
      `CREATE POLICY "Users can manage their own content analytics" ON ${table}
        FOR ALL USING (auth.uid() = user_id OR auth.uid() = creator_id);`
    ],
    'creator_profiles': [
      `CREATE POLICY "Anyone can view creator profiles" ON ${table}
        FOR SELECT USING (true);`,
      `CREATE POLICY "Users can manage their own creator profile" ON ${table}
        FOR ALL USING (auth.uid() = user_id);`
    ],
    'daily_challenges': [
      `CREATE POLICY "Authenticated users can view daily challenges" ON ${table}
        FOR SELECT USING (auth.role() = 'authenticated');`,
      `CREATE POLICY "Only admins can manage daily challenges" ON ${table}
        FOR ALL USING (EXISTS (
          SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        ));`
    ],
    'engagement_events': [
      `CREATE POLICY "Users can view their own engagement events" ON ${table}
        FOR SELECT USING (auth.uid() = user_id);`,
      `CREATE POLICY "Users can manage their own engagement events" ON ${table}
        FOR ALL USING (auth.uid() = user_id);`
    ]
  };

  return policies[table] || [];
}

// Run the fix
fixUnrestrictedTables().catch(console.error);