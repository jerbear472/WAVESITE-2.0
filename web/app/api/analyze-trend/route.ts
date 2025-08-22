import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
Trend: ${data.title}
Platform: ${data.platform}
Category: ${data.category}
Lifecycle Stage: ${data.trendVelocity === 'just_starting' ? 'Early' : 
                  data.trendVelocity === 'picking_up' ? 'Rising' :
                  data.trendVelocity === 'viral' ? 'Peak' :
                  data.trendVelocity === 'saturated' ? 'Saturated' : 'Declining'}
Velocity: ${data.trendVelocity === 'just_starting' ? 'Slow' :
            data.trendVelocity === 'picking_up' ? 'Steady' :
            data.trendVelocity === 'viral' ? 'Rapid' :
            data.trendVelocity === 'saturated' ? 'Plateau' : 'Declining'}
Size: ${data.trendSize === 'micro' ? 'Micro (Under 10K)' :
        data.trendSize === 'niche' ? 'Niche (10K-100K)' :
        data.trendSize === 'viral' ? 'Viral (100K-1M)' :
        data.trendSize === 'mega' ? 'Mega (1M-10M)' : 'Global (10M+)'}
Demographics: ${data.audienceAge?.join(', ') || 'General'}
Sentiment: ${data.sentiment}% positive
AI Involvement: ${data.aiAngle === 'using_ai' ? 'AI-Generated Content' :
                  data.aiAngle === 'reacting_to_ai' ? 'Reactions to AI' :
                  data.aiAngle === 'ai_tool_viral' ? 'AI Tool Going Viral' :
                  data.aiAngle === 'ai_technique' ? 'AI Technique/Hack' :
                  data.aiAngle === 'anti_ai' ? 'Anti-AI Sentiment' : 'No AI Involvement'}
Predicted Peak: ${data.predictedPeak}
Context: ${data.post_caption || 'No additional context'}
Engagement: ${data.likes_count ? `${data.likes_count} likes, ${data.comments_count} comments, ${data.views_count} views` : 'Not available'}
`;
  return context.trim();
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Check cache first
    const cacheKey = generateCacheKey(data);
    const cached = analysisCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ 
        analysis: cached.analysis,
        cached: true 
      });
    }

    // Generate new analysis using OpenAI
    const trendContext = formatTrendContext(data);
    
    const systemPrompt = `You are WaveSight AI, a hype analyst who gets excited about early trend discoveries. 
You celebrate users for spotting trends before everyone else.
You're not corporate - you're like a friend who's excited they found something cool.
Write with energy and make the spotter feel like they're ahead of the curve.
Use bold markdown (**text**) to emphasize the coolest parts.
Keep it to 75-100 words.`;

    const userPrompt = `This user just spotted a trend! Analyze it and tell them:
1. Why their discovery is fire (what makes this special)
2. When this will blow up (timeline prediction)
3. What pattern they caught that others missed
4. Why they're ahead of the game for spotting this now

${trendContext}

Format: Write as an excited single paragraph that makes them feel smart for catching this early. Use **bold** for the hype moments. Be specific about why this catch matters.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const analysis = completion.choices[0]?.message?.content || 
      "Unable to generate analysis. Please try again.";

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
    
    // Fallback analysis if API fails
    const fallbackAnalysis = `Yo, you caught this **way early**! This is about to explode in the next **48-72 hours** 
based on the velocity pattern you spotted. Most people won't see this coming for another day or two, but you're 
already on it. The **${data.sentiment}% positive sentiment** is insane for something this fresh - that's the signal 
everyone else is missing. You're literally **ahead of 99% of people** who'll be talking about this next week!`;

    return NextResponse.json({ 
      analysis: fallbackAnalysis,
      error: true,
      cached: false 
    });
  }
}