import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let thumbnailUrl = '';
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        // YouTube provides multiple quality thumbnails
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        // Check if maxresdefault exists, fallback to hqdefault
        try {
          const checkResponse = await fetch(thumbnailUrl, { method: 'HEAD' });
          if (!checkResponse.ok) {
            thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }
        } catch {
          thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      }
    }
    
    // Instagram
    else if (url.includes('instagram.com')) {
      // Instagram requires oEmbed API
      try {
        const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const data = await response.json();
          thumbnailUrl = data.thumbnail_url || '';
        }
      } catch (err) {
        console.error('Instagram oEmbed failed:', err);
      }
    }
    
    // X/Twitter
    else if (url.includes('twitter.com') || url.includes('x.com')) {
      // Twitter requires oEmbed API
      try {
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const data = await response.json();
          // Extract image from HTML if available
          const match = data.html?.match(/<img[^>]+src="([^"]+)"/);
          if (match) {
            thumbnailUrl = match[1];
          }
        }
      } catch (err) {
        console.error('Twitter oEmbed failed:', err);
      }
    }
    
    // Reddit
    else if (url.includes('reddit.com')) {
      // Add .json to Reddit URL to get JSON data
      try {
        const jsonUrl = url.replace(/\/$/, '') + '.json';
        const response = await fetch(jsonUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WaveSight/1.0)'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const post = data[0]?.data?.children?.[0]?.data;
          
          if (post) {
            // Check for preview images
            if (post.preview?.images?.[0]?.source?.url) {
              thumbnailUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&');
            }
            // Check for thumbnail
            else if (post.thumbnail && post.thumbnail !== 'self' && post.thumbnail !== 'default') {
              thumbnailUrl = post.thumbnail;
            }
            // Check for media metadata
            else if (post.media_metadata) {
              const firstMedia = Object.values(post.media_metadata)[0] as any;
              if (firstMedia?.s?.u) {
                thumbnailUrl = firstMedia.s.u.replace(/&amp;/g, '&');
              }
            }
          }
        }
      } catch (err) {
        console.error('Reddit JSON fetch failed:', err);
      }
    }
    
    // TikTok (use existing oEmbed approach)
    else if (url.includes('tiktok.com')) {
      try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const data = await response.json();
          thumbnailUrl = data.thumbnail_url || '';
        }
      } catch (err) {
        console.error('TikTok oEmbed failed:', err);
      }
    }
    
    return NextResponse.json({ 
      thumbnail_url: thumbnailUrl,
      platform: detectPlatform(url)
    });
    
  } catch (error: any) {
    console.error('Thumbnail extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract thumbnail', details: error.message },
      { status: 500 }
    );
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('reddit.com')) return 'reddit';
  if (url.includes('tiktok.com')) return 'tiktok';
  return 'unknown';
}