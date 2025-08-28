import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    console.log('Testing XP system for user:', userId);
    
    // Test 1: Check what tables exist
    const tables = ['xp_events', 'xp_transactions', 'user_profiles', 'user_xp'];
    const results: any = {};
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      results[table] = {
        exists: !error || !error.message.includes('not exist'),
        error: error?.message
      };
    }
    
    // Test 2: Try to insert XP
    const testXP = 10;
    let xpAdded = false;
    let method = '';
    
    // Try xp_events
    if (results.xp_events.exists) {
      const { error } = await supabase
        .from('xp_events')
        .insert({
          user_id: userId,
          xp_change: testXP,
          event_type: 'test',
          description: 'Test XP award',
          created_at: new Date().toISOString()
        });
      
      if (!error) {
        xpAdded = true;
        method = 'xp_events';
      }
      results.xp_events.insertError = error?.message;
    }
    
    // Try xp_transactions
    if (!xpAdded && results.xp_transactions.exists) {
      const { error } = await supabase
        .from('xp_transactions')
        .insert({
          user_id: userId,
          amount: testXP,
          transaction_type: 'test',
          description: 'Test XP award',
          created_at: new Date().toISOString()
        });
      
      if (!error) {
        xpAdded = true;
        method = 'xp_transactions';
      }
      results.xp_transactions.insertError = error?.message;
    }
    
    // Try user_profiles
    if (!xpAdded && results.user_profiles.exists) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('total_xp')
        .eq('id', userId)
        .single();
      
      if (profile) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ 
            total_xp: (profile.total_xp || 0) + testXP
          })
          .eq('id', userId);
        
        if (!error) {
          xpAdded = true;
          method = 'user_profiles';
        }
        results.user_profiles.insertError = error?.message;
      }
    }
    
    return NextResponse.json({
      success: xpAdded,
      method,
      tables: results,
      message: xpAdded ? `Successfully added ${testXP} XP via ${method}` : 'Failed to add XP'
    });
    
  } catch (error) {
    console.error('Test XP error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}