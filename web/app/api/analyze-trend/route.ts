import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Generate intelligent contextual analysis without external API
    const analysis = generateSmartFallback(data);
    
    return NextResponse.json({ 
      analysis,
      cached: false,
      fallback: true 
    });
    
  } catch (error: any) {
    console.error('Error in analyze-trend:', error);
    
    // Even if something fails, return a basic analysis
    return NextResponse.json({ 
      analysis: `📱 This trend is gaining traction as people discover new ways to express themselves. 
👥 **Who's in:** Early adopters are leading the charge, with mainstream audiences starting to take notice.
💡 **The insight:** The rapid spread suggests this taps into something we've all been feeling - perfect timing meets genuine need for connection.`,
      error: true,
      errorMessage: 'Analysis service error',
      cached: false 
    });
  }
}