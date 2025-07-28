import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSafeCategory } from '@/lib/safeCategory';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, category } = body;
    
    // Create minimal test submission
    const testData = {
      spotter_id: userId || '1c756d2d-b068-4887-8bbb-b5f0273135c1', // Your user ID from logs
      category: getSafeCategory(category || 'Humor & Memes'),
      description: 'Test submission',
      evidence: {
        url: 'https://example.com',
        title: 'Test',
        platform: 'other'
      },
      virality_prediction: 5,
      status: 'submitted', // EXPLICITLY SET TO SUBMITTED
      quality_score: 0.5,
      validation_count: 0
    };
    
    console.log('TEST API - Submitting:', JSON.stringify(testData, null, 2));
    
    const { data, error } = await supabase
      .from('trend_submissions')
      .insert(testData);
    
    if (error) {
      console.error('TEST API - Error:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error,
        sentData: testData 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data,
      sentData: testData 
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      type: 'catch'
    }, { status: 500 });
  }
}