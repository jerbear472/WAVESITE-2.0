import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/v1/marketing/trends
// Returns trends relevant for marketing purposes
export async function GET() {
  try {
    // Get viral and approved trends for marketing
    const { data: trends, error } = await supabase
      .from('trend_submissions')
      .select(`
        id,
        category,
        description,
        screenshot_url,
        thumbnail_url,
        platform,
        creator_handle,
        creator_name,
        likes_count,
        comments_count,
        shares_count,
        views_count,
        hashtags,
        virality_prediction,
        wave_score,
        status,
        created_at
      `)
      .in('status', ['approved', 'viral'])
      .gte('virality_prediction', 7) // High viral potential
      .order('views_count', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching marketing trends:', error);
      return NextResponse.json({ 
        trends: [],
        error: 'Failed to fetch marketing trends' 
      }, { status: 500 });
    }

    // Group trends by category for marketing insights
    const trendsByCategory = trends?.reduce((acc: any, trend: any) => {
      const category = trend.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(trend);
      return acc;
    }, {}) || {};

    return NextResponse.json({ 
      trends: trends || [],
      byCategory: trendsByCategory,
      totalCount: trends?.length || 0,
      metrics: {
        avgViralityScore: trends?.reduce((sum, t) => sum + (t.virality_prediction || 0), 0) / (trends?.length || 1),
        totalViews: trends?.reduce((sum, t) => sum + (t.views_count || 0), 0),
        totalEngagement: trends?.reduce((sum, t) => sum + (t.likes_count || 0) + (t.comments_count || 0) + (t.shares_count || 0), 0)
      }
    });
    
  } catch (error) {
    console.error('Marketing trends API error:', error);
    return NextResponse.json({ 
      trends: [],
      byCategory: {},
      error: 'Internal server error'
    }, { status: 500 });
  }
}