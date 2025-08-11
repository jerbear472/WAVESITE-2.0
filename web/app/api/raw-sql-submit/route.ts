import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Get environment variables at runtime, not build time
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aicahushpcslwjwrlqbo.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Try raw SQL insert to bypass any ORM issues
    const { data, error } = await supabase.rpc('insert_trend_submission', {
      p_spotter_id: user.id,
      p_category: 'meme_format',
      p_description: 'Test submission via RPC',
      p_evidence: {
        url: 'https://example.com',
        title: 'Test',
        platform: 'other'
      }
    });
    
    if (error) {
      // If RPC doesn't exist, show what we tried
      return NextResponse.json({ 
        error: error.message,
        note: 'RPC function may not exist. Create it with the SQL below:',
        createRpcSql: `
CREATE OR REPLACE FUNCTION insert_trend_submission(
  p_spotter_id UUID,
  p_category TEXT,
  p_description TEXT,
  p_evidence JSONB
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO trend_submissions (
    spotter_id,
    category,
    description,
    evidence,
    virality_prediction,
    status,
    quality_score,
    validation_count
  ) VALUES (
    p_spotter_id,
    p_category,
    p_description,
    p_evidence,
    5,
    'submitted',
    0.5,
    0
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`
      }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, data });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}