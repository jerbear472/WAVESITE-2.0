import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { trend_id, vote_type, vote_value, user_id } = await request.json();

    // Validate input
    if (!trend_id || !vote_type || !user_id || vote_value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Cast the vote using the database function
    const { data, error } = await supabase
      .rpc('cast_trend_vote', {
        p_user_id: user_id,
        p_trend_id: trend_id,
        p_vote_type: vote_type,
        p_vote_value: vote_value
      });

    if (error) {
      console.error('Error casting vote:', error);
      return NextResponse.json(
        { 
          error: 'Failed to cast vote',
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      );
    }

    // Award XP for voting
    const xpToAward = data.is_new_vote ? 10 : 5;
    
    // Update user XP - fetch current values first then increment
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp_total, daily_xp')
      .eq('id', user_id)
      .single();
      
    await supabase
      .from('profiles')
      .update({ 
        xp_total: (profile?.xp_total || 0) + xpToAward,
        daily_xp: (profile?.daily_xp || 0) + xpToAward
      })
      .eq('id', user_id);

    return NextResponse.json({
      success: true,
      vote_cast: vote_type,
      xp_earned: xpToAward,
      ...data
    });

  } catch (error: any) {
    console.error('Vote endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch vote data for a trend
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { searchParams } = new URL(request.url);
    const trend_id = searchParams.get('trend_id');
    const user_id = searchParams.get('user_id');

    if (!trend_id) {
      return NextResponse.json(
        { error: 'Missing trend_id' },
        { status: 400 }
      );
    }

    // Get trend vote data
    const { data: trendData, error: trendError } = await supabase
      .from('trend_submissions')
      .select('heat_score, wave_votes, fire_votes, declining_votes, dead_votes, total_votes')
      .eq('id', trend_id)
      .single();

    if (trendError) {
      console.error('Error fetching trend data:', trendError);
      return NextResponse.json(
        { error: 'Failed to fetch trend data' },
        { status: 500 }
      );
    }

    // Get user's vote if user_id provided
    let userVote = null;
    if (user_id) {
      const { data: voteData } = await supabase
        .from('trend_votes')
        .select('vote_type')
        .eq('trend_id', trend_id)
        .eq('user_id', user_id)
        .single();
      
      userVote = voteData?.vote_type || null;
    }

    return NextResponse.json({
      heat_score: trendData.heat_score || 0,
      user_vote: userVote,
      vote_distribution: {
        wave: trendData.wave_votes || 0,
        fire: trendData.fire_votes || 0,
        declining: trendData.declining_votes || 0,
        dead: trendData.dead_votes || 0,
        total: trendData.total_votes || 0
      }
    });

  } catch (error: any) {
    console.error('Vote GET endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}