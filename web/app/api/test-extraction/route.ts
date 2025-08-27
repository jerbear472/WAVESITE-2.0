import { NextRequest, NextResponse } from 'next/server';
import { MetadataExtractor } from '@/lib/metadataExtractorSafe';
import { getUltraSimpleThumbnail } from '@/lib/ultraSimpleThumbnail';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url') || 'https://www.tiktok.com/@khaby.lame/video/7158395478974025990';
  
  console.log('Testing extraction for:', url);
  
  try {
    // Test direct extraction
    const directData = await getUltraSimpleThumbnail(url);
    console.log('Direct extraction result:', directData);
    
    // Test full metadata extraction
    const metadata = await MetadataExtractor.extractFromUrl(url);
    console.log('Full metadata result:', metadata);
    
    return NextResponse.json({
      url,
      direct: directData,
      metadata,
      success: true
    });
  } catch (error) {
    console.error('Extraction test error:', error);
    return NextResponse.json({
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
}