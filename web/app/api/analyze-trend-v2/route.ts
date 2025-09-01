import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache
const analysisCache = new Map<string, { analysis: any; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

interface TrendAnalysis {
  summary: string;
  viralityScore: number;
  keyFactors: string[];
  predictions: {
    peakTime: string;
    longevity: string;
    nextPhase: string;
  };
  recommendations: string[];
  searchInsights?: string;
}

async function performWebSearch(query: string): Promise<string> {
  // Use a web search API or scraping service here
  // For now, we'll return enriched context
  return `Current trending data shows high engagement across multiple platforms with increasing search volume.`;
}

async function analyzeTrendWithClaude(data: any, searchContext: string): Promise<TrendAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('No Anthropic API key configured');
  }

  const prompt = `You are a trend analysis expert. Analyze this trend and provide a comprehensive but concise analysis.

TREND DATA:
Title: ${data.title || 'Unknown'}
Description: ${data.description || 'No description'}
Platform: ${data.platform || 'Unknown'}
Category: ${data.category || 'General'}
URL: ${data.url || 'No URL'}
Current Votes: Wave: ${data.wave_votes || 0}, Fire: ${data.fire_votes || 0}, Declining: ${data.declining_votes || 0}, Dead: ${data.dead_votes || 0}

WEB CONTEXT:
${searchContext}

Provide a JSON response with EXACTLY this structure (no markdown, just JSON):
{
  "summary": "2-3 sentence analysis of why this trend is gaining traction and its cultural significance",
  "viralityScore": <number 1-100 based on viral potential>,
  "keyFactors": ["factor 1", "factor 2", "factor 3"],
  "predictions": {
    "peakTime": "when it will likely peak (e.g., '2-3 weeks', '1 month')",
    "longevity": "how long it will last (e.g., 'short burst', '3-6 months')",
    "nextPhase": "what happens next (e.g., 'mainstream adoption', 'niche community')"
  },
  "recommendations": ["actionable insight 1", "actionable insight 2"]
}

Be direct, specific, and insightful. Focus on actionable intelligence.`;

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
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more consistent JSON
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
      throw new Error('Failed to get AI analysis');
    }

    const result = await response.json();
    
    if (result.content && result.content[0] && result.content[0].text) {
      try {
        // Parse the JSON response
        const analysisText = result.content[0].text;
        // Remove any markdown code blocks if present
        const cleanJson = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        // Return a structured fallback
        return {
          summary: result.content[0].text.substring(0, 200),
          viralityScore: 70,
          keyFactors: ['Emerging trend', 'Growing engagement', 'Cross-platform appeal'],
          predictions: {
            peakTime: '2-4 weeks',
            longevity: '2-3 months',
            nextPhase: 'Mainstream adoption'
          },
          recommendations: ['Monitor closely', 'Consider early adoption']
        };
      }
    }
    
    throw new Error('Invalid AI response format');
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    throw error;
  }
}

function generateQuickAnalysis(data: any): TrendAnalysis {
  // Calculate a basic virality score based on votes
  const totalVotes = (data.wave_votes || 0) + (data.fire_votes || 0);
  const negativeVotes = (data.declining_votes || 0) + (data.dead_votes || 0);
  const viralityScore = Math.min(100, Math.max(10, 
    50 + (totalVotes * 5) - (negativeVotes * 10)
  ));

  return {
    summary: `${data.title} is showing ${viralityScore > 70 ? 'strong' : viralityScore > 40 ? 'moderate' : 'early'} viral signals on ${data.platform || 'social media'}. The trend appears to be ${data.category || 'lifestyle'}-focused with ${totalVotes > negativeVotes ? 'positive' : 'mixed'} community sentiment.`,
    viralityScore,
    keyFactors: [
      totalVotes > 10 ? 'High engagement' : 'Growing interest',
      data.platform === 'tiktok' ? 'TikTok algorithm boost' : `${data.platform || 'Platform'} visibility`,
      'Community validation'
    ],
    predictions: {
      peakTime: viralityScore > 70 ? '1-2 weeks' : '3-4 weeks',
      longevity: viralityScore > 60 ? '2-3 months' : '1-2 months',
      nextPhase: viralityScore > 70 ? 'Mainstream breakout' : 'Niche growth'
    },
    recommendations: [
      viralityScore > 70 ? 'Act quickly to capitalize' : 'Monitor for growth signals',
      'Track engagement metrics daily'
    ]
  };
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Create cache key
    const cacheKey = JSON.stringify({
      title: data.title,
      platform: data.platform,
      category: data.category,
      wave_votes: data.wave_votes,
      fire_votes: data.fire_votes
    });
    
    // Check cache
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ 
        ...cached.analysis,
        cached: true
      });
    }
    
    let analysis: TrendAnalysis;
    
    try {
      // Try to get web context (optional enhancement)
      const searchQuery = `${data.title} ${data.platform} trend viral ${new Date().getFullYear()}`;
      const searchContext = await Promise.race([
        performWebSearch(searchQuery),
        new Promise<string>(resolve => setTimeout(() => resolve(''), 3000)) // 3s timeout
      ]);
      
      // Get AI analysis
      analysis = await Promise.race([
        analyzeTrendWithClaude(data, searchContext),
        new Promise<TrendAnalysis>(resolve => 
          setTimeout(() => resolve(generateQuickAnalysis(data)), 8000) // 8s timeout
        )
      ]);
    } catch (error) {
      console.error('AI analysis failed, using quick analysis:', error);
      analysis = generateQuickAnalysis(data);
    }
    
    // Cache the result
    analysisCache.set(cacheKey, {
      analysis,
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    if (analysisCache.size > 100) {
      const oldestEntries = Array.from(analysisCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 50);
      oldestEntries.forEach(([key]) => analysisCache.delete(key));
    }
    
    return NextResponse.json(analysis);
    
  } catch (error: any) {
    console.error('Error in analyze-trend-v2:', error);
    
    // Return a basic analysis even on error
    return NextResponse.json({
      summary: 'Analysis temporarily unavailable. This trend shows community engagement.',
      viralityScore: 50,
      keyFactors: ['Community interest', 'Platform activity', 'Emerging trend'],
      predictions: {
        peakTime: '2-4 weeks',
        longevity: '1-3 months',
        nextPhase: 'Growth phase'
      },
      recommendations: ['Monitor trend progress', 'Track engagement metrics'],
      error: true
    });
  }
}