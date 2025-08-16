import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated', authError }, { status: 401 });
    }
    
    console.log('Testing earnings for user:', user.id);
    
    // Test 1: Check if table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('earnings_ledger')
      .select('id')
      .limit(1);
    
    // Test 2: Count user's records
    const { count, error: countError } = await supabase
      .from('earnings_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    // Test 3: Fetch user's earnings
    const { data: earnings, error: earningsError } = await supabase
      .from('earnings_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Test 4: Check if we can insert (test RLS)
    const testEntry = {
      user_id: user.id,
      amount: 0.01,
      type: 'test',
      status: 'test',
      description: 'Test entry - please delete'
    };
    
    const { data: insertTest, error: insertError } = await supabase
      .from('earnings_ledger')
      .insert(testEntry)
      .select()
      .single();
    
    // Clean up test entry if it was created
    if (insertTest) {
      await supabase
        .from('earnings_ledger')
        .delete()
        .eq('id', insertTest.id);
    }
    
    return NextResponse.json({
      success: true,
      user_id: user.id,
      tests: {
        table_exists: !tableError,
        table_error: tableError,
        user_record_count: count || 0,
        count_error: countError,
        earnings_fetched: earnings?.length || 0,
        earnings_error: earningsError,
        can_insert: !insertError,
        insert_error: insertError,
        sample_earning: earnings?.[0] || null
      }
    });
    
  } catch (error) {
    console.error('Test earnings error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error 
    }, { status: 500 });
  }
}