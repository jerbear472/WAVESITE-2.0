import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { aiProcessingService } from '@/lib/aiProcessingService';
import { backgroundJobs } from '@/lib/backgroundJobs';

/**
 * Enhanced trend submission endpoint with AI processing
 * POST /api/trends/submit-ai
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      description,
      category,
      screenshot_url,
      evidence,
      virality_prediction,
      geo_location,
      persona_id
    } = body;

    // Validate required fields
    if (!description || !category) {
      return NextResponse.json({ 
        error: 'Description and category are required' 
      }, { status: 400 });
    }

    // Process through AI pipeline
    console.log('Processing trend through AI pipeline...');
    const aiProcessed = await aiProcessingService.processTrendSubmission(
      description,
      screenshot_url,
      { category, evidence }
    );

    // Prepare submission data
    const submissionData = {
      spotter_id: user.id,
      description,
      category,
      screenshot_url,
      evidence: evidence || {},
      virality_prediction: virality_prediction || 5,
      status: 'submitted',
      
      // AI-enhanced fields
      classification: aiProcessed.classification,
      entities: aiProcessed.entities,
      vector: `[${aiProcessed.embedding.join(',')}]`, // PostgreSQL vector format
      clustered: false,
      
      // Optional location/persona data
      geo_location: geo_location || null,
      persona_id: persona_id || null,
      
      created_at: new Date().toISOString()
    };

    // Insert submission
    const { data: submission, error: insertError } = await supabase
      .from('trend_submissions')
      .insert(submissionData)
      .select('*')
      .single();

    if (insertError) {
      console.error('Submission insert error:', insertError);
      return NextResponse.json({ 
        error: 'Failed to submit trend' 
      }, { status: 500 });
    }

    // Check for immediate clustering if similar trend exists
    try {
      const similarTrends = await aiProcessingService.findSimilarTrends(
        aiProcessed.embedding,
        0.90, // High threshold for immediate match
        1
      );

      if (similarTrends.length > 0) {
        // Immediate cluster assignment for very similar trends
        const matchedTrendId = similarTrends[0].id;
        
        // Get current submission count
        const { data: trendData } = await supabase
          .from('trends')
          .select('submission_count')
          .eq('id', matchedTrendId)
          .single();
        
        // Update trend statistics
        await supabase
          .from('trends')
          .update({
            last_seen: submission.created_at,
            submission_count: (trendData?.submission_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchedTrendId);

        // Link submission to trend
        await supabase
          .from('submission_trend_map')
          .insert({
            submission_id: submission.id,
            trend_id: matchedTrendId,
            similarity_score: similarTrends[0].similarity
          });

        // Mark as clustered
        await supabase
          .from('trend_submissions')
          .update({
            clustered: true,
            cluster_id: matchedTrendId
          })
          .eq('id', submission.id);

        // Return with cluster info
        return NextResponse.json({
          success: true,
          submission: {
            ...submission,
            cluster_id: matchedTrendId,
            similarity_score: similarTrends[0].similarity
          },
          ai_insights: {
            category: aiProcessed.classification.category,
            confidence: aiProcessed.classification.confidence,
            entities: aiProcessed.entities,
            clustered_immediately: true
          }
        });
      }
    } catch (clusterError) {
      console.error('Immediate clustering error:', clusterError);
      // Continue without immediate clustering
    }

    // Trigger background clustering job asynchronously
    setTimeout(() => {
      backgroundJobs.clusterTrends().catch(console.error);
    }, 1000);

    // Return success response
    return NextResponse.json({
      success: true,
      submission,
      ai_insights: {
        category: aiProcessed.classification.category,
        confidence: aiProcessed.classification.confidence,
        entities: aiProcessed.entities,
        clustered_immediately: false
      }
    });

  } catch (error) {
    console.error('Trend submission error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}