// Test earnings functions from browser console
// Copy and paste this into the browser console when logged in

async function testEarnings() {
  const { supabase } = window;
  
  if (!supabase) {
    console.error('Supabase not available in window');
    return;
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No user logged in');
    return;
  }
  
  console.log('Testing earnings for user:', user.id);
  
  // Test 1: Check current earnings
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('pending_earnings, approved_earnings, total_earned')
    .eq('user_id', user.id)
    .single();
    
  console.log('Current profile earnings:', profile);
  
  // Test 2: Try to call add_pending_earnings RPC
  console.log('\nTrying RPC add_pending_earnings...');
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('add_pending_earnings', {
      p_user_id: user.id,
      p_amount: 0.25,
      p_description: 'Test earning from console'
    });
    
  if (rpcError) {
    console.error('RPC failed:', rpcError);
  } else {
    console.log('RPC succeeded:', rpcResult);
  }
  
  // Test 3: Check earnings_ledger
  const { data: ledger } = await supabase
    .from('earnings_ledger')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('\nRecent earnings_ledger entries:', ledger);
  
  // Test 4: Direct update (if RPC fails)
  console.log('\nTrying direct update to user_profiles...');
  const { data: updateResult, error: updateError } = await supabase
    .from('user_profiles')
    .update({ 
      pending_earnings: (profile?.pending_earnings || 0) + 0.25 
    })
    .eq('user_id', user.id)
    .select();
    
  if (updateError) {
    console.error('Direct update failed:', updateError);
  } else {
    console.log('Direct update succeeded:', updateResult);
  }
  
  // Test 5: Check debug endpoint
  const debugResponse = await fetch(`/api/debug-earnings?userId=${user.id}`);
  const debugData = await debugResponse.json();
  console.log('\nDebug endpoint data:', debugData);
}

// Run the test
testEarnings();