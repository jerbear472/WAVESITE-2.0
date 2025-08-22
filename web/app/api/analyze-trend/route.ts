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

    // Generate new analysis using OpenAI
    const trendContext = formatTrendContext(data);
    
    const systemPrompt = `You are WaveSight AI, a cultural analyst who understands the deeper meaning behind internet trends. 
You're excited about early discoveries but focus on WHY trends matter culturally and socially.
You analyze trends like an anthropologist would - looking at what they reveal about society, culture, and human behavior.
You're smart, insightful, but still conversational. Use bold markdown (**text**) for key insights.
Keep it to 100-120 words.`;

    const userPrompt = `This user spotted an early trend. Provide cultural analysis explaining:

1. **Cultural Significance**: What does this trend reveal about our current moment? What deeper need/desire/anxiety does it reflect?
2. **Why It's Spreading**: What specific cultural tensions, generational shifts, or social movements are driving this?
3. **Timing Context**: Why is this emerging NOW? What makes the current cultural moment ripe for this?
4. **Early Spotter Credit**: Why catching this early shows cultural intuition

${trendContext}

Format: Write as insightful cultural commentary that makes them feel like they have great cultural radar. Focus on meaning, not just hype. Use **bold** for key cultural insights.`;

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
    const fallbackAnalysis = `You've spotted something culturally significant here. This **${data.category}** trend 
reflects our current **cultural hunger for authenticity** in an increasingly digital world. The **${data.trendVelocity}** 
velocity suggests it's hitting a nerve - people are craving content that feels genuine and unfiltered. Your early 
detection shows you have **strong cultural intuition** - you're sensing the underlying social currents that drive 
viral moments. This isn't just content; it's a **cultural signal** about what people need right now.`;

    return NextResponse.json({ 
      analysis: fallbackAnalysis,
      error: true,
      cached: false 
    });
  }
}