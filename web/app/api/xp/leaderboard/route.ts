import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'global'; // 'global' or 'weekly'
  const limit = parseInt(searchParams.get('limit') || '50');
  
  if (type === 'weekly') {
    // Get weekly leaderboard
    const { data, error } = await supabase
      .from('weekly_xp_leaderboard')
      .select('*')
      .limit(limit);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ leaderboard: data, type: 'weekly' });
  } else {
    // Get global leaderboard
    const { data, error } = await supabase
      .from('xp_leaderboard')
      .select('*')
      .limit(limit);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ leaderboard: data, type: 'global' });
  }
}