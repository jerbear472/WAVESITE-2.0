import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || !url.includes('tiktok.com')) {
      return NextResponse.json({ error: 'Invalid TikTok URL' }, { status: 400 });
    }

    // Extract video ID from URL
    const videoIdMatch = url.match(/video\/(\d+)/);
    const usernameMatch = url.match(/@([^\/\?]+)/);
    
    if (!videoIdMatch) {
      // Try to handle short URLs
      const shortIdMatch = url.match(/\/t\/([A-Za-z0-9]+)/);
      if (shortIdMatch) {
        return NextResponse.json({
          thumbnail_url: `https://www.tiktok.com/api/img/?itemId=${shortIdMatch[1]}`,
          creator_handle: usernameMatch ? `@${usernameMatch[1]}` : null,
        });
      }
      return NextResponse.json({ error: 'Could not extract video ID' }, { status: 400 });
    }

    const videoId = videoIdMatch[1];
    const username = usernameMatch ? usernameMatch[1] : null;
    
    // List of thumbnail URL patterns to try (using the pattern that worked in our test)
    const thumbnailPatterns = [
      // This pattern worked in our test
      `https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-obj.jpg`,
      // Other reliable patterns
      `https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/${videoId}~tplv-dmt-logom:tos-maliva-p-0000/image.jpeg`,
      `https://p16-sign.tiktokcdn-us.com/tos-useast5-p-0068-tx/${videoId}~tplv-photomode-image.jpeg`,
      `https://p77-sign-sg.tiktokcdn.com/${videoId}~tplv-obj.image`,
      `https://p16-sign-sg.tiktokcdn.com/obj/${videoId}~c5_300x400.jpeg`,
      `https://p16.tiktokcdn.com/obj/${videoId}`,
    ];
    
    // Try to get metadata via oEmbed API first
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    
    try {
      const response = await fetch(oembedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        
        // If we got a thumbnail from oEmbed, use it
        if (data.thumbnail_url) {
          return NextResponse.json({
            thumbnail_url: data.thumbnail_url,
            title: data.title,
            creator_handle: data.author_name ? `@${data.author_name}` : (username ? `@${username}` : null),
            creator_name: data.author_name || username,
            post_caption: data.title,
          });
        }
      }
    } catch (error) {
      console.log('oEmbed fetch failed (expected), using fallback patterns');
    }

    // Return with fallback thumbnail patterns
    return NextResponse.json({
      thumbnail_url: thumbnailPatterns[0], // Use the most reliable pattern
      fallback_thumbnails: thumbnailPatterns, // Provide alternatives
      video_id: videoId,
      creator_handle: username ? `@${username}` : null,
      creator_name: username,
    });

  } catch (error) {
    console.error('TikTok thumbnail extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract thumbnail' }, { status: 500 });
  }
}

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