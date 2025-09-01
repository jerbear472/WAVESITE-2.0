import { NextRequest, NextResponse } from 'next/server';

// Improved thumbnail extraction with fallbacks and better platform support
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let thumbnailUrl = '';
    let metadata: any = {};
    
    // Detect platform
    const platform = detectPlatform(url);
    
    // YouTube - Most reliable
    if (platform === 'youtube') {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        // Try multiple thumbnail qualities in order
        const qualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
        
        for (const quality of qualities) {
          const testUrl = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
          try {
            const checkResponse = await fetch(testUrl, { 
              method: 'HEAD',
              signal: AbortSignal.timeout(3000) // 3 second timeout
            });
            if (checkResponse.ok) {
              thumbnailUrl = testUrl;
              break;
            }
          } catch {
            continue;
          }
        }
        
        // Fallback to standard quality
        if (!thumbnailUrl) {
          thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      }
    }
    
    // TikTok - Use oEmbed API
    else if (platform === 'tiktok') {
      try {
        // TikTok's oEmbed endpoint
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WaveSight/1.0)',
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          thumbnailUrl = data.thumbnail_url || '';
          metadata = {
            title: data.title || '',
            author_name: data.author_name || '',
            author_url: data.author_url || ''
          };
        }
      } catch (err) {
        console.error('TikTok oEmbed failed:', err);
        // Fallback: Extract from meta tags by fetching the page
        thumbnailUrl = await extractFromMetaTags(url);
      }
    }
    
    // Instagram - Try multiple methods
    else if (platform === 'instagram') {
      try {
        // First try oEmbed (may not work for all posts)
        const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}&omitscript=true`;
        const response = await fetch(oembedUrl, {
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          thumbnailUrl = data.thumbnail_url || '';
          metadata = {
            title: data.title || '',
            author_name: data.author_name || ''
          };
        }
      } catch (err) {
        console.error('Instagram oEmbed failed:', err);
        // Fallback: Try to extract from page meta tags
        thumbnailUrl = await extractFromMetaTags(url);
      }
    }
    
    // X/Twitter - Use oEmbed or meta tags
    else if (platform === 'twitter') {
      try {
        // Twitter's oEmbed endpoint
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
        const response = await fetch(oembedUrl, {
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          // Extract image from HTML content
          const htmlMatch = data.html?.match(/<img[^>]+src="([^"]+)"/);
          if (htmlMatch) {
            thumbnailUrl = htmlMatch[1];
          }
          metadata = {
            author_name: data.author_name || '',
            author_url: data.author_url || ''
          };
        }
      } catch (err) {
        console.error('Twitter oEmbed failed:', err);
        // Fallback to meta tags
        thumbnailUrl = await extractFromMetaTags(url);
      }
    }
    
    // Reddit - Use JSON API
    else if (platform === 'reddit') {
      try {
        // Add .json to Reddit URL
        const jsonUrl = url.replace(/\/$/, '').replace(/\?.*$/, '') + '.json';
        const response = await fetch(jsonUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          const post = data[0]?.data?.children?.[0]?.data;
          
          if (post) {
            // Priority order for Reddit thumbnails
            if (post.preview?.images?.[0]?.source?.url) {
              thumbnailUrl = post.preview.images[0].source.url.replace(/&amp;/g, '&');
            } else if (post.url_overridden_by_dest && isImageUrl(post.url_overridden_by_dest)) {
              thumbnailUrl = post.url_overridden_by_dest;
            } else if (post.thumbnail && post.thumbnail !== 'self' && post.thumbnail !== 'default' && post.thumbnail.startsWith('http')) {
              thumbnailUrl = post.thumbnail;
            } else if (post.media?.reddit_video?.fallback_url) {
              // For Reddit videos, generate thumbnail from preview
              thumbnailUrl = post.media.reddit_video.fallback_url.replace('DASH_', 'DASH_2_4_M').replace('.mp4', '_thumb.jpg');
            }
            
            metadata = {
              title: post.title || '',
              author: post.author || '',
              subreddit: post.subreddit || ''
            };
          }
        }
      } catch (err) {
        console.error('Reddit JSON fetch failed:', err);
        thumbnailUrl = await extractFromMetaTags(url);
      }
    }
    
    // LinkedIn
    else if (platform === 'linkedin') {
      // LinkedIn doesn't have a public oEmbed API, use meta tags
      thumbnailUrl = await extractFromMetaTags(url);
    }
    
    // Threads
    else if (platform === 'threads') {
      // Threads uses similar structure to Instagram
      thumbnailUrl = await extractFromMetaTags(url);
    }
    
    // Generic fallback for other platforms
    else {
      thumbnailUrl = await extractFromMetaTags(url);
    }
    
    return NextResponse.json({ 
      success: true,
      thumbnail_url: thumbnailUrl,
      platform,
      metadata
    });
    
  } catch (error: any) {
    console.error('Thumbnail extraction error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to extract thumbnail', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Extract thumbnail from Open Graph or Twitter meta tags
async function extractFromMetaTags(url: string): Promise<string> {
  try {
    // Use a proxy or server-side fetch to avoid CORS issues
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) return '';
    
    const html = await response.text();
    
    // Try to find Open Graph image
    let match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (match) return match[1];
    
    // Try Twitter card image
    match = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
    if (match) return match[1];
    
    // Try alternate formats
    match = html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
    if (match) return match[1];
    
    match = html.match(/<meta\s+content="([^"]+)"\s+name="twitter:image"/i);
    if (match) return match[1];
    
    // Try to find first image in content
    match = html.match(/<img[^>]+src="(https?:\/\/[^"]+)"/i);
    if (match) return match[1];
    
  } catch (err) {
    console.error('Meta tags extraction failed:', err);
  }
  
  return '';
}

// Helper function to check if URL is an image
function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /youtube\.com\/clip\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Detect platform from URL
function detectPlatform(url: string): string {
  const platformMap: { [key: string]: string[] } = {
    youtube: ['youtube.com', 'youtu.be', 'm.youtube.com'],
    instagram: ['instagram.com', 'instagr.am'],
    twitter: ['twitter.com', 'x.com', 't.co'],
    reddit: ['reddit.com', 'redd.it'],
    tiktok: ['tiktok.com', 'vm.tiktok.com'],
    linkedin: ['linkedin.com', 'lnkd.in'],
    threads: ['threads.net'],
    facebook: ['facebook.com', 'fb.com', 'fb.watch']
  };
  
  const urlLower = url.toLowerCase();
  
  for (const [platform, domains] of Object.entries(platformMap)) {
    if (domains.some(domain => urlLower.includes(domain))) {
      return platform;
    }
  }
  
  return 'unknown';
}