import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  try {
    // Decode the URL
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Check if it's a valid image URL (basic validation)
    const isValidImageUrl = (
      decodedUrl.includes('tiktokcdn.com') ||
      decodedUrl.includes('instagram.com') ||
      decodedUrl.includes('youtube.com') ||
      decodedUrl.includes('ytimg.com') ||
      decodedUrl.includes('twitter.com') ||
      decodedUrl.includes('twimg.com') ||
      decodedUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );

    if (!isValidImageUrl) {
      console.log('Invalid image URL:', decodedUrl);
      return new NextResponse('Invalid image URL', { status: 400 });
    }

    // Fetch the image
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': decodedUrl.includes('tiktok') ? 'https://www.tiktok.com/' : 
                   decodedUrl.includes('instagram') ? 'https://www.instagram.com/' :
                   decodedUrl.includes('youtube') ? 'https://www.youtube.com/' : 
                   'https://www.google.com/',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 seconds
    });

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return new NextResponse('Failed to fetch image', { status: response.status });
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Stream the image data
    const imageBuffer = await response.arrayBuffer();

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new NextResponse('Request timeout', { status: 408 });
      }
    }
    
    return new NextResponse('Failed to proxy image', { status: 500 });
  }
}