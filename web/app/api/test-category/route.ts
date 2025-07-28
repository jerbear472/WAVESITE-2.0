import { NextResponse } from 'next/server';
import { getSafeCategory } from '@/lib/safeCategory';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category } = body;
    
    const mapped = getSafeCategory(category);
    
    return NextResponse.json({
      input: category,
      output: mapped,
      valid: ['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'].includes(mapped)
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}