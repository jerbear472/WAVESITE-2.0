import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check API key from headers
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Validate API key and check rate limits
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Check subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', keyData.user_id)
      .single();

    if (!['professional', 'enterprise', 'hedge_fund'].includes(profile?.subscription_tier)) {
      return NextResponse.json({ error: 'Insufficient plan. Upgrade required.' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');
    const minVelocity = parseFloat(searchParams.get('min_velocity') || '0');
    const timeRange = searchParams.get('time_range') || '24h';

    // Build query
    let query = supabase
      .from('enterprise_trends')
      .select('*')
      .gte('velocity', minVelocity)
      .order('velocity', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    // Apply time filter
    const now = new Date();
    let startDate = new Date();
    switch (timeRange) {
      case '1h':
        startDate.setHours(now.getHours() - 1);
        break;
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
    }
    
    query = query.gte('first_spotted', startDate.toISOString());

    const { data: trends, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update API usage
    await supabase
      .from('api_keys')
      .update({ 
        last_used: new Date().toISOString(),
        request_count: keyData.request_count + 1
      })
      .eq('id', keyData.id);

    // Add rate limit headers
    const headers = new Headers({
      'X-RateLimit-Limit': keyData.rate_limit.toString(),
      'X-RateLimit-Remaining': (keyData.rate_limit - keyData.request_count - 1).toString(),
      'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString(),
    });

    return NextResponse.json({
      data: trends,
      meta: {
        total: trends.length,
        limit,
        offset,
        timestamp: new Date().toISOString()
      }
    }, { headers });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only enterprise and hedge fund tiers can create trends via API
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!['enterprise', 'hedge_fund'].includes(profile?.subscription_tier)) {
      return NextResponse.json({ error: 'Feature requires Enterprise or Hedge Fund plan' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.description || !body.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create trend with enhanced data
    const trendData = {
      ...body,
      user_id: user.id,
      source: 'api',
      validation_score: 100, // API-submitted trends are pre-validated
      first_spotted: new Date().toISOString(),
      current_phase: 'emerging',
      velocity: body.velocity || 50
    };

    const { data: trend, error } = await supabase
      .from('enterprise_trends')
      .insert(trendData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: trend }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}