import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a fresh Supabase client to avoid any caching issues
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Create fresh client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Map category with fresh logic
    const categoryMap: Record<string, string> = {
      'Fashion & Beauty': 'visual_style',
      'Food & Drink': 'behavior_pattern',
      'Humor & Memes': 'meme_format',
      'Lifestyle': 'behavior_pattern',
      'Politics & Social Issues': 'behavior_pattern',
      'Music & Dance': 'audio_music',
      'Sports & Fitness': 'behavior_pattern',
      'Tech & Gaming': 'creator_technique',
      'Art & Creativity': 'visual_style',
      'Education & Science': 'creator_technique'
    };
    
    const mappedCategory = categoryMap[body.category] || 'meme_format';
    
    // Build EXACT insert data
    const insertData = {
      spotter_id: user.id,
      category: mappedCategory,
      description: body.description || 'Test trend',
      evidence: {
        url: body.url || 'https://example.com',
        title: body.trendName || 'Test',
        platform: body.platform || 'other'
      },
      virality_prediction: 5,
      quality_score: 0.5,
      validation_count: 0,
      // DO NOT INCLUDE STATUS - let it use database default
    };
    
    console.log('DIRECT SUBMIT - Inserting:', JSON.stringify(insertData, null, 2));
    
    // Try insert WITHOUT status field
    const { data, error } = await supabase
      .from('trend_submissions')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('DIRECT SUBMIT - Error:', error);
      
      // If it fails without status, try with status
      if (error.message.includes('status')) {
        console.log('DIRECT SUBMIT - Retrying with status field');
        const insertWithStatus = {
          ...insertData,
          status: 'submitted'
        };
        
        const { data: data2, error: error2 } = await supabase
          .from('trend_submissions')
          .insert(insertWithStatus)
          .select()
          .single();
          
        if (error2) {
          return NextResponse.json({ 
            error: error2.message,
            details: error2,
            triedWithStatus: true,
            sentData: insertWithStatus
          }, { status: 400 });
        }
        
        return NextResponse.json({ 
          success: true, 
          data: data2,
          usedStatus: true
        });
      }
      
      return NextResponse.json({ 
        error: error.message,
        details: error,
        sentData: insertData
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data,
      usedStatus: false
    });
    
  } catch (error: any) {
    console.error('DIRECT SUBMIT - Catch error:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      type: 'catch'
    }, { status: 500 });
  }
}