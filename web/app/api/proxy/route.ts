import { NextRequest, NextResponse } from 'next/server';

export async function HEAD(request: NextRequest) {
  // Handle HEAD requests for testing URL availability
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse(null, { status: 400 });
  }

  const decodedUrl = decodeURIComponent(url);
  
  try {
    const response = await fetch(decodedUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout for HEAD requests
    });

    return new NextResponse(null, { 
      status: response.ok ? 200 : response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  const decodedUrl = decodeURIComponent(url);
  console.log('Proxy request for:', decodedUrl);

  try {
    // Add comprehensive headers for better compatibility
    const headers = new Headers({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Referer': 'https://www.tiktok.com/',
    });

    const response = await fetch(decodedUrl, {
      headers: headers,
      // Add timeout for production
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error('Proxy fetch failed:', response.status, response.statusText);
      // Try to get error body for debugging
      const errorText = await response.text();
      console.error('Error response:', errorText.substring(0, 500));
      return NextResponse.json(
        { error: 'Failed to fetch data', status: response.status, details: errorText.substring(0, 200) }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return with CORS headers for production
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    
    // More detailed error messages for debugging
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({ error: 'Request timeout' }, { status: 408 });
      }
      return NextResponse.json(
        { error: 'Failed to proxy request', details: error.message }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}