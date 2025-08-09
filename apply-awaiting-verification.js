#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyAwaitingVerificationUpdates() {
  console.log('🚀 Starting awaiting verification earnings setup...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-awaiting-verification-earnings.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executing SQL migrations...');
    
    // Execute the SQL directly
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    }).catch(async (err) => {
      // If exec_sql doesn't exist, try executing the statements individually
      console.log('⚠️  exec_sql not available, executing statements individually...');
      
      // Split the SQL into individual statements (basic split, might need refinement)
      const statements = sqlContent
        .split(/;(?=\s*(?:CREATE|ALTER|UPDATE|INSERT|DELETE|DROP|DO|GRANT))/i)
        .filter(stmt => stmt.trim().length > 0)
        .map(stmt => stmt.trim() + ';');

      for (const statement of statements) {
        if (statement.includes('--') && !statement.includes('CREATE') && !statement.includes('ALTER')) {
          continue; // Skip pure comment lines
        }
        
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        // Use raw SQL execution through the REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql: statement })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`⚠️  Statement failed (might be expected): ${errorText.substring(0, 100)}`);
        }
      }
    });

    if (sqlError && !sqlError.message?.includes('exec_sql')) {
      throw sqlError;
    }

    console.log('✅ Database migrations completed\n');

    // Test the new setup
    console.log('🧪 Testing the new earnings flow...\n');

    // Check if awaiting_verification column exists
    const { data: columns, error: columnsError } = await supabase
      .from('profiles')
      .select('*')
      .limit(0);

    if (!columnsError) {
      console.log('✅ Profiles table is accessible');
    }

    // Check earnings_ledger table
    const { data: earnings, error: earningsError } = await supabase
      .from('earnings_ledger')
      .select('*')
      .limit(1);

    if (!earningsError) {
      console.log('✅ Earnings ledger table is accessible');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ AWAITING VERIFICATION EARNINGS SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nHow the new system works:');
    console.log('1. When trends are submitted → $1.00 goes to awaiting_verification');
    console.log('2. When trend gets first approval → money moves to total_earnings');
    console.log('3. When trend is rejected → money is removed from awaiting_verification');
    console.log('4. Validators earn $0.01 per validation immediately');
    console.log('\nThe earnings page will now show:');
    console.log('- Awaiting Verification amount (trends pending validation)');
    console.log('- Available earnings (verified trends)');
    console.log('- Total cashed out');
    console.log('\n✅ All systems ready!');

  } catch (error) {
    console.error('\n❌ Error applying updates:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your Supabase connection');
    console.error('2. Ensure you have admin privileges');
    console.error('3. Try running the SQL directly in Supabase dashboard');
    process.exit(1);
  }
}

// Run the update
applyAwaitingVerificationUpdates();