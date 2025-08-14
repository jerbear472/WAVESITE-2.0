import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || !url.includes('tiktok.com')) {
      return NextResponse.json({ error: 'Invalid TikTok URL' }, { status: 400 });
    }

    console.log('Extracting TikTok metadata for:', url);

    // Extract video ID and username from URL
    const videoIdMatch = url.match(/video\/(\d+)/);
    const usernameMatch = url.match(/@([^\/\?]+)/);
    
    if (!videoIdMatch) {
      return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 });
    }

    const videoId = videoIdMatch[1];
    const username = usernameMatch ? usernameMatch[1] : 'unknown';

    // Method 1: Try TikTok oEmbed API first (most reliable when it works)
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const oembedResponse = await fetch(oembedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WaveSight/1.0)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        console.log('TikTok oEmbed success');
        
        return NextResponse.json({
          success: true,
          data: {
            creator_handle: `@${username}`,
            creator_name: oembedData.author_name || username,
            thumbnail_url: oembedData.thumbnail_url,
            post_caption: oembedData.title || '',
            video_id: videoId,
            embed_html: oembedData.html,
          }
        });
      }
    } catch (error) {
      console.log('oEmbed failed, trying alternative methods');
    }

    // Method 2: Try web scraping with proper headers
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (pageResponse.ok) {
        const html = await pageResponse.text();
        
        // Extract thumbnail from meta tags
        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
        const twitterImageMatch = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/);
        
        // Extract title/caption
        const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
        const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
        
        // Extract creator info from JSON-LD
        const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/);
        let creatorName = username;
        
        if (jsonLdMatch) {
          try {
            const jsonLd = JSON.parse(jsonLdMatch[1]);
            if (jsonLd.creator?.name) {
              creatorName = jsonLd.creator.name;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
        
        const thumbnailUrl = ogImageMatch?.[1] || twitterImageMatch?.[1];
        
        if (thumbnailUrl) {
          console.log('Successfully extracted thumbnail from page HTML');
          return NextResponse.json({
            success: true,
            data: {
              creator_handle: `@${username}`,
              creator_name: creatorName,
              thumbnail_url: thumbnailUrl,
              post_caption: titleMatch?.[1] || descMatch?.[1] || '',
              video_id: videoId,
            }
          });
        }
      }
    } catch (error) {
      console.log('Web scraping failed:', error);
    }

    // Method 3: Generate predictable CDN URLs (multiple patterns)
    const cdnPatterns = [
      `https://p16-sign-sg.tiktokcdn.com/tos-alisg-p-0037/${videoId}~noop.image`,
      `https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/${videoId}~noop.image`,
      `https://p19-sign.tiktokcdn-us.com/tos-useast5-p-0068-tx/${videoId}~noop.image`,
      `https://p16-sign.tiktokcdn.com/obj/tos-maliva-p-0068/${videoId}`,
    ];

    // Try each CDN pattern with a HEAD request to check availability
    for (const pattern of cdnPatterns) {
      try {
        const checkResponse = await fetch(pattern, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WaveSight/1.0)',
          },
          signal: AbortSignal.timeout(2000),
        });

        if (checkResponse.ok || checkResponse.status === 200) {
          console.log('Found working CDN URL:', pattern);
          return NextResponse.json({
            success: true,
            data: {
              creator_handle: `@${username}`,
              creator_name: username,
              thumbnail_url: pattern,
              video_id: videoId,
            }
          });
        }
      } catch (error) {
        // Try next pattern
        continue;
      }
    }

    // Method 4: Use our proxy to fetch the thumbnail
    const proxyThumbnailUrl = `/api/proxy-image?url=${encodeURIComponent(`https://p16-sign-sg.tiktokcdn.com/obj/tos-alisg-p-0037/${videoId}~tplv-obj.jpg`)}`;
    
    // Final fallback: Return with proxy URL
    console.log('Using proxy fallback for thumbnail');
    return NextResponse.json({
      success: true,
      data: {
        creator_handle: `@${username}`,
        creator_name: username,
        thumbnail_url: proxyThumbnailUrl,
        video_id: videoId,
        note: 'Using proxy for thumbnail due to CDN restrictions'
      }
    });

  } catch (error) {
    console.error('TikTok extraction error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to extract TikTok metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
}