// Debug script for persona saving issues
// Run this in the browser console when on the persona page

async function debugPersonaSave() {
  const { supabase } = await import('@/lib/supabase');
  
  console.log('🔍 PERSONA SAVE DEBUGGING');
  console.log('========================');
  
  // 1. Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error('❌ Auth error:', authError);
    return;
  }
  console.log('✅ Authenticated as:', user?.email, 'ID:', user?.id);
  
  // 2. Test table access
  console.log('\n📊 Testing table access...');
  const { data: testSelect, error: selectError } = await supabase
    .from('user_personas')
    .select('*')
    .eq('user_id', user?.id)
    .maybeSingle();
    
  if (selectError) {
    console.error('❌ Cannot read from user_personas:', selectError);
    console.log('Error details:', {
      code: selectError.code,
      message: selectError.message,
      details: selectError.details,
      hint: selectError.hint
    });
  } else {
    console.log('✅ Can read from user_personas');
    console.log('Existing data:', testSelect);
  }
  
  // 3. Test insert/update
  console.log('\n📝 Testing upsert...');
  const testData = {
    user_id: user?.id,
    location_country: 'Test Country',
    location_city: 'Test City',
    age_range: '25-34',
    interests: ['test'],
    is_complete: false
  };
  
  const { data: upsertData, error: upsertError } = await supabase
    .from('user_personas')
    .upsert(testData, {
      onConflict: 'user_id'
    })
    .select()
    .single();
    
  if (upsertError) {
    console.error('❌ Cannot upsert to user_personas:', upsertError);
    console.log('Error details:', {
      code: upsertError.code,
      message: upsertError.message,
      details: upsertError.details,
      hint: upsertError.hint
    });
    
    // Common error explanations
    if (upsertError.code === '42P01') {
      console.log('⚠️ Table does not exist. Run the SQL migration script.');
    } else if (upsertError.code === '42501') {
      console.log('⚠️ Permission denied. Check RLS policies.');
    } else if (upsertError.code === '23505') {
      console.log('⚠️ Duplicate key violation.');
    }
  } else {
    console.log('✅ Can upsert to user_personas');
    console.log('Saved data:', upsertData);
  }
  
  // 4. Check RLS policies
  console.log('\n🔒 Checking RLS policies...');
  const { data: policies, error: policyError } = await supabase
    .rpc('get_policies_for_table', { table_name: 'user_personas' })
    .catch(err => ({ data: null, error: err }));
    
  if (policyError) {
    console.log('ℹ️ Cannot check policies (function may not exist)');
  } else if (policies) {
    console.log('Policies:', policies);
  }
  
  // 5. Check localStorage
  console.log('\n💾 Checking localStorage...');
  const localData = localStorage.getItem(`persona_${user?.id}`);
  if (localData) {
    console.log('✅ Found data in localStorage');
    try {
      const parsed = JSON.parse(localData);
      console.log('Local data:', parsed);
    } catch (e) {
      console.error('❌ Cannot parse localStorage data:', e);
    }
  } else {
    console.log('ℹ️ No data in localStorage');
  }
  
  console.log('\n========================');
  console.log('Debug complete. Check the output above for issues.');
}

// Export for use
(window as any).debugPersonaSave = debugPersonaSave;

console.log('Debug script loaded. Run debugPersonaSave() to diagnose issues.');

export { debugPersonaSave };