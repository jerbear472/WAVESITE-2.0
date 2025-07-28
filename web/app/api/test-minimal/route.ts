import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Try different combinations to see what works
    const tests = [
      {
        name: 'Minimal with submitted',
        data: {
          spotter_id: user.id,
          category: 'meme_format',
          description: 'Test 1',
          status: 'submitted'
        }
      },
      {
        name: 'Minimal without status',
        data: {
          spotter_id: user.id,
          category: 'meme_format',
          description: 'Test 2'
        }
      },
      {
        name: 'With all fields',
        data: {
          spotter_id: user.id,
          category: 'meme_format',
          description: 'Test 3',
          status: 'submitted',
          virality_prediction: 5,
          quality_score: 0.5,
          validation_count: 0,
          evidence: {}
        }
      }
    ];
    
    const results = [];
    
    for (const test of tests) {
      console.log(`Testing: ${test.name}`);
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert(test.data);
        
      results.push({
        test: test.name,
        success: !error,
        error: error?.message,
        data: data
      });
      
      // Don't continue if one works
      if (!error) break;
    }
    
    return NextResponse.json({ results });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}