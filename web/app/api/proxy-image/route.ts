import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');
  
  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
  }
  
  try {
    // Decode the URL if it was encoded
    const decodedUrl = decodeURIComponent(imageUrl);
    
    console.log('Proxying image:', decodedUrl);
    
    // Fetch the image with appropriate headers
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      
      // Return a placeholder image
      const svg = `
        <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="400" fill="#1a1a1a"/>
          <text x="200" y="190" font-family="Arial" font-size="18" fill="#666" text-anchor="middle">
            Thumbnail Not Available
          </text>
          <text x="200" y="220" font-family="Arial" font-size="14" fill="#444" text-anchor="middle">
            ${response.status} ${response.statusText}
          </text>
        </svg>
      `;
      
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store',
        },
      });
    }
    
    const buffer = await response.arrayBuffer();
    
    // Return the image with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
      },
    });
    
  } catch (error) {
    console.error('Image proxy error:', error);
    
    // Return error placeholder
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#1a1a1a"/>
        <rect x="150" y="150" width="100" height="100" fill="#333" rx="10"/>
        <text x="200" y="205" font-family="Arial" font-size="60" fill="#666" text-anchor="middle">?</text>
        <text x="200" y="280" font-family="Arial" font-size="14" fill="#666" text-anchor="middle">
          Failed to load thumbnail
        </text>
      </svg>
    `;
    
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store',
      },
    });
  }
}