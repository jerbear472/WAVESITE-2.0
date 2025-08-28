import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    const results: any = {};
    
    // 1. Try to read from xp_transactions to see structure
    const { data: xpTrans, error: xpTransError } = await supabase
      .from('xp_transactions')
      .select('*')
      .limit(1);
    
    results.xp_transactions = {
      sample: xpTrans?.[0],
      error: xpTransError?.message,
      columns: xpTrans?.[0] ? Object.keys(xpTrans[0]) : []
    };
    
    // 2. Try to read from user_xp
    const { data: userXP, error: userXPError } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    results.user_xp = {
      data: userXP,
      error: userXPError?.message,
      columns: userXP ? Object.keys(userXP) : []
    };
    
    // 3. Try to insert into user_xp (or update if exists)
    if (!userXP) {
      // Try to create a new record
      const { data: newXP, error: insertError } = await supabase
        .from('user_xp')
        .insert({
          user_id: userId,
          total_xp: 10,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      results.user_xp_insert = {
        success: !insertError,
        data: newXP,
        error: insertError?.message
      };
    } else {
      // Try to update existing record
      const { data: updatedXP, error: updateError } = await supabase
        .from('user_xp')
        .update({
          total_xp: (userXP.total_xp || 0) + 10,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      results.user_xp_update = {
        success: !updateError,
        data: updatedXP,
        error: updateError?.message
      };
    }
    
    // 4. Try xp_transactions with different column names
    const possibleColumns = [
      { amount: 10, type: 'validation' },
      { amount: 10, event_type: 'validation' },
      { xp_amount: 10, type: 'validation' },
      { xp_change: 10, event_type: 'validation' }
    ];
    
    for (const columns of possibleColumns) {
      const { error } = await supabase
        .from('xp_transactions')
        .insert({
          user_id: userId,
          ...columns,
          created_at: new Date().toISOString()
        });
      
      if (!error) {
        results.xp_transactions_insert = {
          success: true,
          columns_used: columns
        };
        break;
      } else {
        results.xp_transactions_attempts = results.xp_transactions_attempts || [];
        results.xp_transactions_attempts.push({
          columns,
          error: error.message
        });
      }
    }
    
    // 5. Check user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    results.user_profiles = {
      exists: !profileError,
      data: profile,
      error: profileError?.message
    };
    
    // If profile doesn't exist, try to create it
    if (!profile && profileError?.message.includes('not found')) {
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          total_xp: 10,
          current_streak: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      results.user_profiles_create = {
        success: !createError,
        data: newProfile,
        error: createError?.message
      };
    }
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('Debug XP error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}