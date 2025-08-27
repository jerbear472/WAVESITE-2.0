import { NextRequest, NextResponse } from 'next/server';
import { MetadataExtractor } from '@/lib/metadataExtractorSafe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    console.log('[DEBUG-THUMBNAIL] Processing URL:', url);
    
    // Extract metadata
    const metadata = await MetadataExtractor.extractFromUrl(url);
    
    console.log('[DEBUG-THUMBNAIL] Extracted metadata:', metadata);
    
    // Test if thumbnail is accessible
    let thumbnailAccessible = false;
    let thumbnailError = null;
    
    if (metadata.thumbnail_url) {
      try {
        // Try to fetch the thumbnail to see if it's accessible
        const response = await fetch(metadata.thumbnail_url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        thumbnailAccessible = response.ok;
        if (!response.ok) {
          thumbnailError = `Status: ${response.status}`;
        }
      } catch (error) {
        thumbnailError = error instanceof Error ? error.message : 'Unknown error';
      }
    }
    
    const debugInfo = {
      url,
      metadata,
      thumbnailAccessible,
      thumbnailError,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV,
        region: process.env.VERCEL_REGION
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('[DEBUG-THUMBNAIL] Full debug info:', debugInfo);
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('[DEBUG-THUMBNAIL] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Simple GET endpoint for testing
  return NextResponse.json({
    status: 'Debug thumbnail endpoint is working',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV
    }
  });
}