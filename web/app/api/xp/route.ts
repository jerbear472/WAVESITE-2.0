import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get user's XP data
  const { data: xpData, error: xpError } = await supabase
    .from('user_xp')
    .select(`
      *,
      xp_levels!inner(title, badge_url)
    `)
    .eq('user_id', user.id)
    .single();
  
  // Get recent XP transactions
  const { data: transactions } = await supabase
    .from('xp_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // Get user achievements
  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievements!inner(*)
    `)
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false });
  
  // Get leaderboard position
  const { data: leaderboard } = await supabase
    .from('xp_leaderboard')
    .select('global_rank')
    .eq('user_id', user.id)
    .single();
  
  return NextResponse.json({
    xp: xpData || { 
      total_xp: 0, 
      current_level: 1,
      xp_to_next_level: 100,
      xp_levels: { title: 'Newcomer' }
    },
    transactions: transactions || [],
    achievements: userAchievements || [],
    rank: leaderboard?.global_rank || null,
  });
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { amount, type, description, reference_id, reference_type } = await request.json();
  
  // Award XP using the database function
  const { data, error } = await supabase.rpc('award_xp', {
    p_user_id: user.id,
    p_amount: amount,
    p_type: type,
    p_description: description,
    p_reference_id: reference_id,
    p_reference_type: reference_type,
  });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ totalXP: data });
}