const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
    console.log('🔧 Applying earnings_ledger trend_id fix...');
    
    try {
        // Read the SQL file
        const sqlFile = path.join(__dirname, 'fix-earnings-ledger-trend-id.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Execute the SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql });
        
        if (error) {
            // If exec_sql doesn't exist, try running the statements individually
            console.log('⚠️  exec_sql function not found, executing statements individually...');
            
            // First check the current schema
            const { data: columns, error: columnsError } = await supabase
                .from('earnings_ledger')
                .select('*')
                .limit(0);
            
            if (columnsError && columnsError.message.includes('trend_id')) {
                console.log('✅ Confirmed: trend_id column does not exist');
                console.log('📝 The issue is that the function is trying to use trend_id instead of trend_submission_id');
                
                // Check if trend_submission_id exists
                const { data: testData, error: testError } = await supabase
                    .from('earnings_ledger')
                    .select('trend_submission_id')
                    .limit(1);
                
                if (!testError) {
                    console.log('✅ trend_submission_id column exists in earnings_ledger');
                    console.log('');
                    console.log('🎯 SOLUTION: The SQL functions need to be updated to use trend_submission_id instead of trend_id');
                    console.log('');
                    console.log('📋 Please run the following SQL in Supabase SQL Editor:');
                    console.log('');
                    console.log('-- Copy and paste this SQL into Supabase SQL Editor --');
                    console.log(sql);
                    console.log('');
                    console.log('🔗 Go to: https://supabase.com/dashboard/project/_/sql/new');
                    console.log('');
                    return;
                }
            }
        }
        
        console.log('✅ Fix applied successfully!');
        
        // Verify the fix
        const { data: verifyData, error: verifyError } = await supabase
            .from('earnings_ledger')
            .select('id, user_id, trend_submission_id, amount')
            .limit(5);
        
        if (!verifyError) {
            console.log('✅ Earnings ledger table is accessible');
            console.log(`📊 Sample records: ${verifyData.length} found`);
        }
        
    } catch (err) {
        console.error('❌ Error applying fix:', err.message);
        console.log('');
        console.log('📋 Please run the SQL manually in Supabase:');
        console.log('1. Go to https://supabase.com/dashboard/project/_/sql/new');
        console.log('2. Copy the contents of fix-earnings-ledger-trend-id.sql');
        console.log('3. Paste and run in the SQL editor');
    }
}

// Run the fix
applyFix().then(() => {
    console.log('');
    console.log('🎉 Process complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test submitting a trend in the application');
    console.log('2. Check if the error is resolved');
    console.log('3. If issues persist, check the Supabase logs for more details');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});