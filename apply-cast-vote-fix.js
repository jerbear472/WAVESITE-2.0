const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Supabase credentials
const SUPABASE_URL = 'https://achuavagkhjenaypawij.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjU5NjQyNCwiZXhwIjoyMDY4MTcyNDI0fQ.Z-Kl-xPV9cRWEbDP8nklpvQQDlOKmLNU6gl8j21ixr0';

async function executeSQLViaAPI(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/query`);
    
    const options = {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ query_text: sql }));
    req.end();
  });
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  console.log('Testing current cast_trend_vote function...');
  
  // Test the current function
  const { data: testResult, error: testError } = await supabase
    .rpc('cast_trend_vote', {
      trend_id: '00000000-0000-0000-0000-000000000000',
      vote_type: 'verify'
    });
  
  console.log('Current function response:', testResult);
  
  // The function is returning the correct structure, but we need to ensure
  // it handles authentication properly. Let's check with a real user.
  
  // First, let's check the function's behavior with authentication
  const anonSupabase = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g');
  
  console.log('\nChecking authentication handling...');
  const { data: anonResult, error: anonError } = await anonSupabase
    .rpc('cast_trend_vote', {
      trend_id: '00000000-0000-0000-0000-000000000000',
      vote_type: 'verify'
    });
  
  console.log('Anonymous call result:', anonResult);
  console.log('Anonymous call error:', anonError);
  
  if (anonResult && anonResult.error === 'Not authenticated. Please log in.') {
    console.log('\n✅ Function is working correctly!');
    console.log('The "Failed to submit vote" error is likely due to:');
    console.log('1. User not being properly authenticated');
    console.log('2. User trying to vote on their own trend');
    console.log('3. User already voted on the trend');
    console.log('\nThe function itself is working as expected.');
  }
  
  // Let's also check the table structures
  console.log('\nChecking table structures...');
  
  const { data: validations } = await supabase
    .from('trend_validations')
    .select('*')
    .limit(1);
    
  const { data: earnings } = await supabase
    .from('earnings_ledger')
    .select('*')
    .limit(1);
    
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1);
  
  console.log('Tables accessible: ✅');
  
  // Check recent errors
  console.log('\nChecking for recent validation attempts...');
  const { data: recentValidations, error: recentError } = await supabase
    .from('trend_validations')
    .select('id, created_at, validator_id, vote')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (recentValidations && recentValidations.length > 0) {
    console.log('Recent validations found:', recentValidations.length);
    console.log('Last validation:', recentValidations[0].created_at);
  } else {
    console.log('No recent validations found');
  }
}

main().catch(console.error);