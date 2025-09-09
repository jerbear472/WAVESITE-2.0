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

  const prompt = `You are an expert trend analyst. Analyze this trend with deep cultural understanding and internet literacy.

Trend: "${data.title || data.description || 'Unknown trend'}"
Platform: ${data.platform || 'social media'}
Category: ${data.category || 'general'}
Additional Context: ${data.description || 'No additional context'}

Your analysis should:
1. **Decode the trend**: What does this phrase/trend actually mean? Break down any slang, references, or cultural context needed to understand it.
2. **Origin story**: Where did this likely come from? (Consider viral videos, celebrity moments, memes, songs, etc.)
3. **Why it resonates**: What makes this catch on? Consider:
   - The humor or emotion it captures
   - Generational appeal (Gen Z humor, millennial nostalgia, etc.)
   - Current events or cultural moments it reflects
   - Psychological needs it fulfills (belonging, expression, humor, etc.)
4. **Evolution potential**: How might this trend evolve or what variations are we seeing?

If this involves internet slang, AAVE, or cultural references, explain them clearly. If it references a specific event or person, provide that context.

Be specific and insightful - don't just say "it's relatable" but explain WHY and HOW. Use emojis strategically. Write 3-4 paragraphs that actually educate someone about this trend.`;

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
        max_tokens: 1000,
        temperature: 0.8,
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
    
    // Check if this is a full analysis request
    if (data.fullAnalysis) {
      return handleFullAnalysis(data);
    }
    
    // Original simple analysis logic
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

async function handleFullAnalysis(data: any) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    // Generate comprehensive analysis
    const prompt = `Analyze this trend comprehensively:

Trend: ${data.title || data.description}
Category: ${data.category}
Platform: ${data.platform || 'Unknown'}
URL: ${data.url || 'N/A'}
Hashtags: ${data.hashtags?.join(', ') || 'None'}
Current Metrics:
- Views: ${data.metrics?.views || 0}
- Likes: ${data.metrics?.likes || 0}
- Comments: ${data.metrics?.comments || 0}

Provide a structured analysis with:
1. Summary (2-3 sentences about what this trend is)
2. Virality Score (0-100) with reasoning
3. Expected peak timeframe
4. Cultural context and why it resonates
5. Similar trends or movements
6. Target demographics (list 3-5)
7. Growth trajectory (Accelerating/Steady/Peaking/Declining)
8. Strategic recommendations (list 4-5 actionable items)

Also perform web search to find:
- Recent articles about this trend
- Social media sentiment
- Related trending topics

Format with clear sections and be specific with data.`;

    let fullAnalysis;
    
    if (apiKey) {
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
            max_tokens: 2000,
            temperature: 0.7,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.content && result.content[0] && result.content[0].text) {
            fullAnalysis = parseAnalysisResponse(result.content[0].text);
          }
        }
      } catch (error) {
        console.error('Claude API error:', error);
      }
    }
    
    // If no API or failed, use enhanced fallback
    if (!fullAnalysis) {
      fullAnalysis = generateFullFallbackAnalysis(data);
    }
    
    // Add mock web context (would integrate with real search API)
    const webContext = await generateWebContext(data.title || data.description);
    
    return NextResponse.json({
      ...fullAnalysis,
      web_context: webContext
    });
    
  } catch (error: any) {
    console.error('Full analysis error:', error);
    return NextResponse.json(generateFullFallbackAnalysis(data));
  }
}

function parseAnalysisResponse(text: string) {
  // Parse Claude's response into structured format
  const sections = text.split(/\n\d+\.\s+/);
  
  return {
    summary: extractContent(text, 'summary') || sections[1] || 'Trend analysis in progress...',
    virality_prediction: {
      score: extractScore(text) || 65,
      reasoning: extractContent(text, 'reasoning|virality') || 'Based on current engagement patterns.',
      peak_timeframe: extractContent(text, 'peak|timeframe') || '3-5 days'
    },
    cultural_context: extractContent(text, 'cultural|context') || sections[4] || 'Reflects current cultural movements.',
    similar_trends: extractList(text, 'similar|related'),
    target_demographics: extractList(text, 'demographic|audience|target'),
    growth_trajectory: extractContent(text, 'trajectory|growth') || 'Accelerating',
    recommendations: extractList(text, 'recommend|strategic|action')
  };
}

function extractContent(text: string, pattern: string): string {
  const regex = new RegExp(`(${pattern})[:\s]+([^.]+\.)`, 'i');
  const match = text.match(regex);
  return match ? match[2].trim() : '';
}

function extractScore(text: string): number {
  const match = text.match(/(\d+)\s*(?:\/100|%|score)/i);
  return match ? parseInt(match[1]) : 65;
}

function extractList(text: string, pattern: string): string[] {
  const section = extractContent(text, pattern);
  if (!section) return generateDefaultList(pattern);
  
  return section.split(/[,;•-]/)
    .map(item => item.trim())
    .filter(item => item.length > 2)
    .slice(0, 5);
}

function generateDefaultList(type: string): string[] {
  if (type.includes('demographic')) {
    return ['Gen Z (18-24)', 'Millennials (25-34)', 'Digital Natives'];
  }
  if (type.includes('recommend')) {
    return [
      'Create derivative content within 24-48 hours',
      'Focus on authentic engagement',
      'Leverage trending hashtags',
      'Cross-platform amplification'
    ];
  }
  return ['Emerging pattern', 'Growing interest', 'Community driven'];
}

function generateFullFallbackAnalysis(data: any) {
  const score = Math.floor(Math.random() * 30) + 60; // 60-90 range
  
  return {
    summary: `This ${data.category || 'cultural'} trend on ${data.platform || 'social media'} shows strong engagement patterns and viral potential.`,
    virality_prediction: {
      score,
      reasoning: 'High initial engagement and strong emotional resonance suggest viral potential.',
      peak_timeframe: '3-5 days'
    },
    cultural_context: 'This trend taps into current cultural movements around authenticity and shared experiences.',
    similar_trends: ['Winter Arc', 'Girl Dinner', 'Quiet Luxury'],
    target_demographics: ['Gen Z (18-24)', 'Young Millennials (25-34)', 'TikTok Users'],
    growth_trajectory: 'Accelerating',
    recommendations: [
      'Create content within the next 24-48 hours',
      'Focus on authentic, relatable angles',
      'Use relevant hashtag combinations',
      'Monitor engagement metrics closely'
    ]
  };
}

async function generateWebContext(query: string) {
  // Mock web context - would integrate with real search API
  return {
    related_articles: [
      {
        title: `"${query}" Gains Traction on Social Media`,
        url: '#',
        snippet: 'The trend has captured attention across multiple platforms...'
      },
      {
        title: `Understanding the ${query} Movement`,
        url: '#',
        snippet: 'Experts analyze why this resonates with audiences...'
      }
    ],
    social_mentions: Math.floor(Math.random() * 50000) + 10000,
    sentiment: ['positive', 'neutral', 'mixed'][Math.floor(Math.random() * 3)] as any
  };
}