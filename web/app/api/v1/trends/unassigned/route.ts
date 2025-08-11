import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/v1/trends/unassigned
// Returns trends that haven't been assigned to any umbrella/category
export async function GET() {
  try {
    // Get approved trends from database
    // Note: trend_umbrella_id is deprecated, returning all approved trends
    const { data: trends, error } = await supabase
      .from('trend_submissions')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching unassigned trends:', error);
      return NextResponse.json({ 
        trends: [],
        error: 'Failed to fetch trends' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      trends: trends || [],
      count: trends?.length || 0
    });
    
  } catch (error) {
    console.error('Unassigned trends API error:', error);
    // Return empty array as fallback
    return NextResponse.json({ 
      trends: [],
      error: 'Internal server error'
    });
  }
}