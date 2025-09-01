import { NextRequest, NextResponse } from 'next/server';

// Test endpoint for thumbnail extraction
export async function GET(request: NextRequest) {
  const testUrls = {
    youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tiktok: 'https://www.tiktok.com/@zachking/video/7309504442249637166',
    instagram: 'https://www.instagram.com/reel/C1234567890/',
    twitter: 'https://twitter.com/elonmusk/status/1234567890',
    reddit: 'https://www.reddit.com/r/technology/comments/xyz123/sample_post/',
    youtubeShort: 'https://youtube.com/shorts/abc123',
    threads: 'https://www.threads.net/@username/post/C123456'
  };

  const results: any = {};

  for (const [platform, url] of Object.entries(testUrls)) {
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/extract-thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (response.ok) {
        const data = await response.json();
        results[platform] = {
          success: data.success,
          thumbnail_url: data.thumbnail_url,
          has_thumbnail: !!data.thumbnail_url,
          platform: data.platform,
          metadata: data.metadata
        };
      } else {
        results[platform] = {
          success: false,
          error: 'Failed to extract'
        };
      }
    } catch (error: any) {
      results[platform] = {
        success: false,
        error: error.message
      };
    }
  }

  return NextResponse.json({
    message: 'Thumbnail extraction test results',
    timestamp: new Date().toISOString(),
    results
  });
}

// POST endpoint to test specific URLs
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(`${request.nextUrl.origin}/api/extract-thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    
    return NextResponse.json({
      url,
      ...data,
      test_status: data.success && data.thumbnail_url ? 'PASSED' : 'FAILED'
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}