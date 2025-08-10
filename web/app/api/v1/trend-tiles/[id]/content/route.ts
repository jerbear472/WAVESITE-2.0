import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/v1/trend-tiles/[id]/content
// Returns content for a specific trend tile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ 
        error: 'Trend tile ID is required' 
      }, { status: 400 });
    }

    // Fetch trend tile content from database
    const { data: trendTile, error } = await supabase
      .from('trend_tiles')
      .select(`
        *,
        trend_submissions (
          id,
          description,
          category,
          screenshot_url,
          thumbnail_url,
          creator_handle,
          likes_count,
          views_count
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching trend tile:', error);
      
      // If table doesn't exist, return mock data
      if (error.message.includes('trend_tiles')) {
        return NextResponse.json({
          content: {
            id,
            title: 'Trend Tile',
            description: 'Content not available',
            trends: []
          }
        });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch trend tile content' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      content: trendTile || null 
    });
    
  } catch (error) {
    console.error('Trend tile content API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      content: null
    }, { status: 500 });
  }
}