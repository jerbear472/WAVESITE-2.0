import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client for Claude
const apiKey = process.env.ANTHROPIC_API_KEY;
console.log('Anthropic API Key exists:', !!apiKey);
console.log('API Key first 10 chars:', apiKey?.substring(0, 10));

const anthropic = new Anthropic({
  apiKey: apiKey,
});

// Cache for similar analyses (in-memory for now, could be Redis in production)
const analysisCache = new Map<string, { analysis: string; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Generate cache key from trend data
function generateCacheKey(data: any): string {
  const key = `${data.category}_${data.trendVelocity}_${data.trendSize}_${data.sentiment}_${data.aiAngle}`;
  return key.toLowerCase().replace(/\s+/g, '_');
}

// Format the trend data for AI analysis
function formatTrendContext(data: any): string {
  const context = `
Trend: ${data.title || data.description}
Platform: ${data.platform || 'Not specified'}
Driving Generation: ${data.drivingGeneration === 'gen_alpha' ? 'Gen Alpha (9-14)' :
                       data.drivingGeneration === 'gen_z' ? 'Gen Z (15-24)' :
                       data.drivingGeneration === 'millennials' ? 'Millennials (25-40)' :
                       data.drivingGeneration === 'gen_x' ? 'Gen X (40-55)' :
                       data.drivingGeneration === 'boomers' ? 'Boomers (55+)' : 'Not specified'}
Origin: ${data.trendOrigin === 'organic' ? 'Organic/User generated' :
          data.trendOrigin === 'influencer' ? 'Influencer/Creator pushed' :
          data.trendOrigin === 'brand' ? 'Brand/Marketing campaign' :
          data.trendOrigin === 'ai_generated' ? 'AI/Bot generated' : 'Unknown'}
Evolution: ${data.evolutionStatus === 'original' ? 'Original' :
             data.evolutionStatus === 'variants' ? 'Variants emerging' :
             data.evolutionStatus === 'parody' ? 'Parody phase' :
             data.evolutionStatus === 'meta' ? 'Meta evolution' :
             data.evolutionStatus === 'final' ? 'Final form' : 'Unknown'}
Velocity: ${data.trendVelocity === 'just_starting' ? 'Just Starting (1-2 days old)' :
            data.trendVelocity === 'picking_up' ? 'Picking Up (3-7 days)' :
            data.trendVelocity === 'viral' ? 'Going Viral (Peak momentum)' :
            data.trendVelocity === 'saturated' ? 'Saturated (Everywhere)' : 
            data.trendVelocity === 'declining' ? 'Declining' : 'Unknown'}
Size Prediction: ${data.trendSize === 'micro' ? 'Micro (Under 10K)' :
                   data.trendSize === 'niche' ? 'Niche (10K-100K)' :
                   data.trendSize === 'viral' ? 'Viral (100K-1M)' :
                   data.trendSize === 'mega' ? 'Mega (1M-10M)' : 
                   data.trendSize === 'global' ? 'Global (10M+)' : 'Unknown'}
Sentiment: ${data.sentiment || 50}% positive
Engagement: ${data.likes_count ? `${data.likes_count} likes, ${data.comments_count} comments, ${data.views_count} views` : 'Early stage - no metrics yet'}
`;
  return context.trim();
}

export async function POST(request: NextRequest) {
  let data: any = {};
  
  try {
    data = await request.json();
    
    // Check cache first
    const cacheKey = generateCacheKey(data);
    const cached = analysisCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ 
        analysis: cached.analysis,
        cached: true 
      });
    }

    // Generate new analysis using Claude
    const trendContext = formatTrendContext(data);
    
    // Determine the lifecycle stage from velocity
    const lifecycleStage = data.trendVelocity === 'declining' || data.trendVelocity === 'saturated' ? 'peaking/declining' :
                           data.trendVelocity === 'viral' ? 'peaking' :
                           data.trendVelocity === 'picking_up' ? 'rising' : 'emerging';
    
    const prompt = `Analyze this trend for WaveSight users:

${trendContext}

Write a 100-120 word analysis covering:

1. WHAT: Explain what this trend actually is
2. WHY IT RESONATES: The human psychology and cultural moment behind it
3. WHO'S PARTICIPATING: What types of people/creators are driving this
4. THE INSIGHT: One non-obvious observation about why it's spreading now

${lifecycleStage === 'peaking/declining' ? 
  'Note: This trend is peaking/declining - focus on what happened and lessons learned, not future predictions.' : 
  lifecycleStage === 'peaking' ?
  'Note: This trend is at peak - focus on why it reached critical mass and what it means.' :
  'Note: This trend is emerging/rising - focus on why its gaining traction now.'}

Style: Cultural anthropologist explaining human behavior patterns. Use emojis for structure (💡 for insight, 👥 for who's participating, etc). Focus on creativity, self-expression, and cultural dynamics - NOT corporate opportunities. Keep it real and relatable.
100-120 words ONLY.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 250,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const analysis = message.content[0].type === 'text' 
      ? message.content[0].text
      : "Unable to generate analysis. Please try again.";

    // Cache the result
    analysisCache.set(cacheKey, {
      analysis,
      timestamp: Date.now()
    });

    // Clean old cache entries
    for (const [key, value] of analysisCache.entries()) {
      if (Date.now() - value.timestamp > CACHE_DURATION) {
        analysisCache.delete(key);
      }
    }

    return NextResponse.json({ 
      analysis,
      cached: false 
    });

  } catch (error: any) {
    console.error('Error generating trend analysis:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      type: error.constructor.name
    });
    
    // Fallback analysis if API fails
    const fallbackAnalysis = `📱 This represents how people are expressing themselves in new ways online. 
👥 **Who's in:** Early adopters, creative communities, and anyone looking to connect authentically
💡 **The insight:** The speed of adoption shows we were all feeling the same thing but didn't have a way to express it - until now.`;

    return NextResponse.json({ 
      analysis: fallbackAnalysis,
      error: true,
      errorMessage: error.message,
      cached: false 
    });
  }
}