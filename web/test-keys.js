require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testKeys() {
  console.log('Testing Supabase keys...');
  
  // Test anon key
  console.log('\n1. Testing anon key...');
  try {
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabaseAnon
      .from('trend_submissions')
      .select('id')
      .limit(1);
      
    if (error) {
      console.log('Anon key error:', error.message);
    } else {
      console.log('✅ Anon key works');
    }
  } catch (err) {
    console.log('❌ Anon key failed:', err.message);
  }

  // Test service role key
  console.log('\n2. Testing service role key...');
  try {
    const supabaseService = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabaseService
      .from('trend_submissions')
      .select('id')
      .limit(1);
      
    if (error) {
      console.log('Service key error:', error.message);
    } else {
      console.log('✅ Service key works');
    }
  } catch (err) {
    console.log('❌ Service key failed:', err.message);
  }
  
  // Test RPC call with service key
  console.log('\n3. Testing cast_trend_vote function with service key...');
  try {
    const supabaseService = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabaseService.rpc('cast_trend_vote', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_trend_id: '00000000-0000-0000-0000-000000000000',
      p_vote_type: 'fire',
      p_vote_value: 1
    });
    
    if (error) {
      console.log('RPC error:', error.message);
    } else {
      console.log('✅ RPC call works:', data);
    }
  } catch (err) {
    console.log('❌ RPC call failed:', err.message);
  }
}

testKeys();