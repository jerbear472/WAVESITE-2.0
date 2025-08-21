import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // 1. Get all users from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username');
    
    if (profilesError) {
      return NextResponse.json({ error: 'Failed to fetch profiles', details: profilesError }, { status: 500 });
    }

    const results = [];
    
    for (const profile of profiles || []) {
      // 2. Check if user has entry in user_xp
      const { data: userXP, error: xpError } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', profile.id)
        .single();
      
      if (xpError && xpError.code !== 'PGRST116') { // PGRST116 = no rows
        console.error(`Error fetching user_xp for ${profile.username}:`, xpError);
        continue;
      }
      
      // 3. Calculate actual XP from transactions
      const { data: transactions, error: transError } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('user_id', profile.id);
      
      const actualXP = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      
      // 4. If no user_xp entry, create one
      if (!userXP) {
        const level = calculateLevel(actualXP);
        const { error: insertError } = await supabase
          .from('user_xp')
          .insert({
            user_id: profile.id,
            total_xp: actualXP,
            current_level: level.level,
            xp_to_next_level: level.xpToNext
          });
        
        if (insertError) {
          console.error(`Failed to create user_xp for ${profile.username}:`, insertError);
        } else {
          results.push({
            username: profile.username,
            action: 'created',
            xp: actualXP,
            level: level.level
          });
        }
      } 
      // 5. If XP mismatch, update it
      else if (userXP.total_xp !== actualXP) {
        const level = calculateLevel(actualXP);
        const { error: updateError } = await supabase
          .from('user_xp')
          .update({
            total_xp: actualXP,
            current_level: level.level,
            xp_to_next_level: level.xpToNext
          })
          .eq('user_id', profile.id);
        
        if (updateError) {
          console.error(`Failed to update user_xp for ${profile.username}:`, updateError);
        } else {
          results.push({
            username: profile.username,
            action: 'updated',
            oldXP: userXP.total_xp,
            newXP: actualXP,
            level: level.level
          });
        }
      } else {
        results.push({
          username: profile.username,
          action: 'no_change',
          xp: actualXP,
          level: userXP.current_level
        });
      }
    }
    
    // 6. Get updated leaderboard to verify
    const { data: leaderboard } = await supabase
      .from('xp_leaderboard')
      .select('username, total_xp')
      .order('total_xp', { ascending: false })
      .limit(10);
    
    return NextResponse.json({
      success: true,
      message: 'XP synchronization complete',
      results,
      topUsers: leaderboard
    });
    
  } catch (error) {
    console.error('Fix XP error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}

function calculateLevel(xp: number): { level: number; xpToNext: number } {
  const levels = [
    { level: 15, threshold: 12500 },
    { level: 14, threshold: 10000 },
    { level: 13, threshold: 8000 },
    { level: 12, threshold: 6600 },
    { level: 11, threshold: 5500 },
    { level: 10, threshold: 4500 },
    { level: 9, threshold: 3600 },
    { level: 8, threshold: 2800 },
    { level: 7, threshold: 2100 },
    { level: 6, threshold: 1500 },
    { level: 5, threshold: 1000 },
    { level: 4, threshold: 600 },
    { level: 3, threshold: 300 },
    { level: 2, threshold: 100 },
    { level: 1, threshold: 0 }
  ];
  
  for (const { level, threshold } of levels) {
    if (xp >= threshold) {
      const nextLevel = levels.find(l => l.level === level + 1);
      const xpToNext = nextLevel ? nextLevel.threshold - xp : 0;
      return { level, xpToNext: Math.max(0, xpToNext) };
    }
  }
  
  return { level: 1, xpToNext: 100 - xp };
}