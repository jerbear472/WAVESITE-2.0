import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache to avoid redundant API calls
const analysisCache = new Map<string, { analysis: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Generate smart contextual fallback based on actual trend data
function generateSmartFallback(data: any): string {
  const trendName = data?.title || data?.trend_name || 'This trend';
  const platform = data?.platform || 'social media';
  const category = data?.category || 'lifestyle';
  
  // Velocity-based insights
  const velocityInsights: Record<string, string> = {
    'just_starting': 'catching early adopters who sense something new',
    'picking_up': 'gaining momentum as more people discover its appeal',
    'viral': 'hitting critical mass as everyone wants to participate',
    'saturated': 'reaching peak saturation across all demographics',
    'declining': 'evolving into its next form or finding its niche audience'
  };
  
  // Generation-based participants
  const generationParticipants: Record<string, string> = {
    'gen_z': 'Gen Z creators and their engaged communities',
    'millennials': 'Millennials who blend nostalgia with innovation',
    'gen_x': 'Gen X bringing authentic perspective and experience',
    'boomers': 'Boomers discovering new forms of digital expression',
    'all_ages': 'People across all generations finding common ground'
  };
  
  // Origin-based insights
  const originInsights: Record<string, string> = {
    'organic': 'emerged naturally from genuine shared experiences',
    'influencer': 'amplified by creators who understood the moment perfectly',
    'brand': 'started as marketing but resonated with real human needs',
    'ai_generated': 'shows how AI and human creativity can blend together'
  };
  
  const velocity = data?.trendVelocity || 'picking_up';
  const generation = data?.drivingGeneration || 'gen_z';
  const origin = data?.trendOrigin || 'organic';
  
  const velocityText = velocityInsights[velocity] || velocityInsights['picking_up'];
  const participantText = generationParticipants[generation] || generationParticipants['all_ages'];
  const originText = originInsights[origin] || originInsights['organic'];
  
  return `📱 ${trendName} is ${velocityText} on ${platform}.

👥 **Who's in:** ${participantText} are leading the charge, creating variations that keep it fresh and relevant.

💡 **The insight:** This ${originText}, showing how timing and authenticity create viral moments that actually matter to people.`;
}

async function callAnthropicAPI(data: any): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.log('No Anthropic API key found, using fallback');
    return generateSmartFallback(data);
  }

  const prompt = `Analyze this trend and explain why it resonates with people. Be specific about the psychological and cultural factors. Keep it concise (2-3 sentences max).

Trend: ${data.title || 'Unknown trend'}
Platform: ${data.platform || 'social media'}
Category: ${data.category || 'general'}
Velocity: ${data.trendVelocity || 'unknown'}
Size: ${data.trendSize || 'unknown'}
Sentiment: ${data.sentiment || 50}%
Description: ${data.description || 'No description provided'}

Provide a brief, insightful analysis focusing on:
1. Why this specific trend resonates now
2. What psychological need it fulfills
3. The cultural moment it captures

Format your response with emojis and bold text for emphasis. Keep it punchy and insightful.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return generateSmartFallback(data);
    }

    const result = await response.json();
    
    if (result.content && result.content[0] && result.content[0].text) {
      return result.content[0].text;
    }
    
    return generateSmartFallback(data);
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    return generateSmartFallback(data);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Create a cache key from the trend data
    const cacheKey = JSON.stringify({
      title: data.title,
      velocity: data.trendVelocity,
      category: data.category,
      platform: data.platform
    });
    
    // Check cache first
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached analysis');
      return NextResponse.json({ 
        analysis: cached.analysis,
        cached: true,
        fallback: false 
      });
    }
    
    // Try to get AI analysis with timeout
    const analysisPromise = callAnthropicAPI(data);
    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve(generateSmartFallback(data)), 5000); // 5 second timeout
    });
    
    const analysis = await Promise.race([analysisPromise, timeoutPromise]);
    
    // Cache the result
    analysisCache.set(cacheKey, {
      analysis,
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    if (analysisCache.size > 100) {
      const entries = Array.from(analysisCache.entries());
      const oldEntries = entries
        .filter(([_, value]) => Date.now() - value.timestamp > CACHE_DURATION)
        .map(([key]) => key);
      oldEntries.forEach(key => analysisCache.delete(key));
    }
    
    return NextResponse.json({ 
      analysis,
      cached: false,
      fallback: analysis === generateSmartFallback(data)
    });
    
  } catch (error: any) {
    console.error('Error in analyze-trend:', error);
    
    // Even if something fails, return a basic analysis
    return NextResponse.json({ 
      analysis: generateSmartFallback({}),
      error: true,
      errorMessage: error.message || 'Analysis service error',
      cached: false 
    });
  }
}