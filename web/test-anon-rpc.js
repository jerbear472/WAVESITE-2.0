require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testAnonRPC() {
  console.log('Testing RPC with anon key...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase.rpc('cast_trend_vote', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_trend_id: '00000000-0000-0000-0000-000000000000',
      p_vote_type: 'fire',
      p_vote_value: 1
    });
    
    if (error) {
      console.log('❌ RPC error:', error);
    } else {
      console.log('✅ RPC success:', data);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

testAnonRPC();