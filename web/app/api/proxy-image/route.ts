import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
    }
    
    // Decode the URL
    const decodedUrl = decodeURIComponent(imageUrl);
    console.log('Proxying image:', decodedUrl);
    
    // Fetch the image with proper headers
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.tiktok.com/',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      
      // Return a placeholder image for failed requests
      const svg = `
        <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="400" fill="#1a1a1a"/>
          <text x="200" y="190" font-family="Arial" font-size="20" fill="#666" text-anchor="middle">
            Preview Unavailable
          </text>
          <text x="200" y="220" font-family="Arial" font-size="14" fill="#444" text-anchor="middle">
            Click to view on TikTok
          </text>
        </svg>
      `;
      
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    
    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    });
    
  } catch (error) {
    console.error('Image proxy error:', error);
    
    // Return error placeholder
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#1a1a1a"/>
        <text x="200" y="200" font-family="Arial" font-size="18" fill="#ff4444" text-anchor="middle">
          Failed to load image
        </text>
      </svg>
    `;
    
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
      },
    });
  }
}

// POST method for compatibility
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }
    
    // Redirect to GET with URL parameter
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    return NextResponse.json({ proxy_url: proxyUrl });
    
  } catch (error) {
    console.error('POST proxy error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}