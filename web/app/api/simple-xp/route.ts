import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { userId, amount = 10, type = 'validation' } = await request.json();
    
    console.log('Simple XP Award:', { userId, amount, type });
    
    // Simple insert into xp_transactions
    const { data, error } = await supabase
      .from('xp_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        type: type,
        description: 'Test XP Award',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('XP Insert Error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      });
    }
    
    // Also update user_xp
    const { data: userXP } = await supabase
      .from('user_xp')
      .select('total_xp')
      .eq('user_id', userId)
      .single();
    
    if (userXP) {
      const { error: updateError } = await supabase
        .from('user_xp')
        .update({
          total_xp: userXP.total_xp + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('user_xp update error:', updateError);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      data,
      message: `Successfully awarded ${amount} XP`
    });
    
  } catch (error) {
    console.error('Simple XP error:', error);
    return NextResponse.json({ 
      success: false,
      error: String(error) 
    }, { status: 500 });
  }
}