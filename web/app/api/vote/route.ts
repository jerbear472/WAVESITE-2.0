import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized. Please log in to vote.' 
      }, { status: 401 });
    }
    
    // Get vote data from request
    const { trendId, voteType } = await request.json();
    
    if (!trendId || !voteType) {
      return NextResponse.json({ 
        error: 'Missing required fields: trendId and voteType' 
      }, { status: 400 });
    }
    
    // Validate vote type
    const validVoteTypes = ['wave', 'fire', 'declining', 'dead'];
    if (!validVoteTypes.includes(voteType)) {
      return NextResponse.json({ 
        error: 'Invalid vote type. Must be: wave, fire, declining, or dead' 
      }, { status: 400 });
    }
    
    // Calculate vote value
    const voteValue = voteType === 'wave' ? 2 : 
                     voteType === 'fire' ? 1 : 
                     voteType === 'declining' ? -1 : -2;
    
    console.log('📝 API: Processing vote:', {
      user_id: user.id,
      trend_id: trendId,
      vote_type: voteType,
      vote_value: voteValue
    });
    
    // First, check if user already voted
    const { data: existingVote } = await supabase
      .from('trend_user_votes')
      .select('id, vote_type')
      .eq('user_id', user.id)
      .eq('trend_id', trendId)
      .single();
    
    let result;
    
    if (existingVote) {
      // Update existing vote
      const { data, error } = await supabase
        .from('trend_user_votes')
        .update({
          vote_type: voteType,
          vote_value: voteValue,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('trend_id', trendId)
        .select()
        .single();
      
      if (error) {
        console.error('❌ API: Error updating vote:', error);
        return NextResponse.json({ 
          error: 'Failed to update vote',
          details: error.message 
        }, { status: 500 });
      }
      
      result = data;
      console.log('✅ API: Vote updated successfully');
    } else {
      // Insert new vote
      const { data, error } = await supabase
        .from('trend_user_votes')
        .insert({
          user_id: user.id,
          trend_id: trendId,
          vote_type: voteType,
          vote_value: voteValue,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ API: Error inserting vote:', error);
        return NextResponse.json({ 
          error: 'Failed to save vote',
          details: error.message 
        }, { status: 500 });
      }
      
      result = data;
      console.log('✅ API: Vote saved successfully');
    }
    
    // Get updated vote counts
    const { data: voteCounts } = await supabase
      .from('trend_user_votes')
      .select('vote_type')
      .eq('trend_id', trendId);
    
    const counts = {
      wave: 0,
      fire: 0,
      declining: 0,
      dead: 0
    };
    
    voteCounts?.forEach(vote => {
      if (vote.vote_type && counts.hasOwnProperty(vote.vote_type)) {
        counts[vote.vote_type as keyof typeof counts]++;
      }
    });
    
    return NextResponse.json({ 
      success: true,
      vote: result,
      counts,
      message: existingVote ? 'Vote updated' : 'Vote saved'
    });
    
  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Get trend ID from request
    const { trendId } = await request.json();
    
    if (!trendId) {
      return NextResponse.json({ 
        error: 'Missing trendId' 
      }, { status: 400 });
    }
    
    // Delete vote
    const { error } = await supabase
      .from('trend_user_votes')
      .delete()
      .eq('user_id', user.id)
      .eq('trend_id', trendId);
    
    if (error) {
      console.error('❌ API: Error deleting vote:', error);
      return NextResponse.json({ 
        error: 'Failed to remove vote',
        details: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Vote removed'
    });
    
  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred'
    }, { status: 500 });
  }
}