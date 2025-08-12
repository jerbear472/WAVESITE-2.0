import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('id');
  
  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
  }
  
  // Try multiple thumbnail patterns
  const patterns = [
    `https://www.tiktok.com/api/img/?itemId=${videoId}&location=0&aid=1988`,
    `https://p16-sign-sg.tiktokcdn.com/aweme/720x720/tos-alisg-p-0037/${videoId}.webp`,
    `https://p16.tiktokcdn.com/obj/tos-maliva-p-0068/${videoId}`,
  ];
  
  for (const pattern of patterns) {
    try {
      const response = await fetch(pattern, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.tiktok.com/',
        },
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': response.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    } catch (error) {
      console.log(`Pattern failed: ${pattern}`);
      continue;
    }
  }
  
  // If all patterns fail, return a placeholder image
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#000"/>
      <text x="200" y="200" font-family="Arial" font-size="24" fill="#fff" text-anchor="middle">
        TikTok Video
      </text>
      <text x="200" y="230" font-family="Arial" font-size="16" fill="#888" text-anchor="middle">
        ${videoId.slice(0, 10)}...
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