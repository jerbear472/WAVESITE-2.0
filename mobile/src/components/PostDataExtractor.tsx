import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

interface PostData {
  creator?: string;
  creatorName?: string;
  caption?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  thumbnail?: string;
  hashtags?: string[];
  musicInfo?: {
    title?: string;
    artist?: string;
  };
  postedAt?: string;
}

interface PostDataExtractorRef {
  extractData: (url: string) => Promise<PostData>;
}

const PostDataExtractor = forwardRef<PostDataExtractorRef>((props, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [extractionResolve, setExtractionResolve] = useState<((data: PostData) => void) | null>(null);
  const [extractionReject, setExtractionReject] = useState<((error: Error) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    extractData: async (url: string): Promise<PostData> => {
      return new Promise((resolve, reject) => {
        setExtractionResolve(() => resolve);
        setExtractionReject(() => reject);
        setCurrentUrl(url);
        
        // Set a timeout
        setTimeout(() => {
          if (extractionReject) {
            reject(new Error('Extraction timeout'));
            setExtractionReject(null);
            setExtractionResolve(null);
          }
        }, 15000); // 15 second timeout
      });
    },
  }));

  // Instagram extraction script
  const instagramExtractionScript = `
    (function() {
      try {
        // Wait for content to load
        setTimeout(() => {
          const extractData = () => {
            const data = {};
            
            // Try multiple selectors for Instagram
            // Creator handle
            const creatorLink = document.querySelector('a[role="link"] span') || 
                              document.querySelector('h2 a span') ||
                              document.querySelector('header a[href*="/"] span');
            if (creatorLink) {
              data.creator = '@' + creatorLink.textContent.trim();
            }

            // Caption
            const captionElement = document.querySelector('meta[property="og:description"]') ||
                                 document.querySelector('meta[name="description"]');
            if (captionElement) {
              data.caption = captionElement.getAttribute('content');
            } else {
              // Try to find caption in the post
              const captionSpan = document.querySelector('h1') || 
                                document.querySelector('span[dir="auto"]');
              if (captionSpan) {
                data.caption = captionSpan.textContent;
              }
            }

            // Extract hashtags from caption
            if (data.caption) {
              const hashtags = data.caption.match(/#[a-zA-Z0-9_]+/g);
              if (hashtags) {
                data.hashtags = hashtags;
              }
            }

            // Likes - Instagram hides exact counts, but we can try
            const likeButton = document.querySelector('button[aria-label*="like"]') ||
                             document.querySelector('svg[aria-label*="Like"]');
            if (likeButton) {
              const likesText = likeButton.parentElement?.parentElement?.textContent;
              if (likesText) {
                const likesMatch = likesText.match(/([0-9,]+)\\s*(likes?|curtid)/i);
                if (likesMatch) {
                  data.likes = parseInt(likesMatch[1].replace(/,/g, ''));
                }
              }
            }

            // Try to get likes from meta tags or section
            const likesSection = document.querySelector('section span') ||
                               document.querySelector('button span');
            if (likesSection && likesSection.textContent.includes('like')) {
              const num = parseInt(likesSection.textContent.replace(/[^0-9]/g, ''));
              if (!isNaN(num)) {
                data.likes = num;
              }
            }

            // Comments count
            const viewCommentsLink = document.querySelector('a[href*="#comments"]') ||
                                   document.querySelector('a span[dir="auto"]');
            if (viewCommentsLink) {
              const commentsText = viewCommentsLink.textContent;
              const commentsMatch = commentsText.match(/View\\s+all\\s+([0-9,]+)\\s+comments/i);
              if (commentsMatch) {
                data.comments = parseInt(commentsMatch[1].replace(/,/g, ''));
              }
            }

            // Thumbnail
            const img = document.querySelector('img[srcset]') ||
                       document.querySelector('video[poster]') ||
                       document.querySelector('meta[property="og:image"]');
            if (img) {
              if (img.tagName === 'IMG') {
                data.thumbnail = img.src || img.srcset.split(' ')[0];
              } else if (img.tagName === 'VIDEO') {
                data.thumbnail = img.poster;
              } else {
                data.thumbnail = img.getAttribute('content');
              }
            }

            // For Reels, try to get views
            const viewsElement = document.querySelector('span[aria-label*="plays"]') ||
                               document.querySelector('span:contains("views")');
            if (viewsElement) {
              const viewsText = viewsElement.textContent;
              const viewsMatch = viewsText.match(/([0-9,]+[KMB]?)\\s*(views?|plays?)/i);
              if (viewsMatch) {
                data.views = parseCount(viewsMatch[1]);
              }
            }

            // Posted date
            const timeElement = document.querySelector('time[datetime]');
            if (timeElement) {
              data.postedAt = timeElement.getAttribute('datetime');
            }

            return data;
          };

          const parseCount = (str) => {
            if (!str) return 0;
            str = str.toUpperCase().replace(/,/g, '');
            if (str.includes('K')) return parseFloat(str) * 1000;
            if (str.includes('M')) return parseFloat(str) * 1000000;
            if (str.includes('B')) return parseFloat(str) * 1000000000;
            return parseInt(str) || 0;
          };

          const result = extractData();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'extraction_complete',
            platform: 'instagram',
            data: result
          }));
        }, 3000); // Wait 3 seconds for page to load
      } catch (error) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'extraction_error',
          error: error.toString()
        }));
      }
    })();
    true;
  `;

  // TikTok extraction script
  const tiktokExtractionScript = `
    (function() {
      try {
        // Wait for content to load
        setTimeout(() => {
          const extractData = () => {
            const data = {};
            
            // Try to get data from JSON-LD
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            let videoData = null;
            
            jsonLdScripts.forEach(script => {
              try {
                const json = JSON.parse(script.textContent);
                if (json['@type'] === 'VideoObject' || json.name) {
                  videoData = json;
                }
              } catch (e) {}
            });

            if (videoData) {
              data.creator = '@' + (videoData.creator?.alternateName || videoData.author?.alternateName || '').replace('@', '');
              data.caption = videoData.description || videoData.name;
              data.thumbnail = videoData.thumbnailUrl?.[0] || videoData.thumbnail;
              data.views = parseInt(videoData.interactionStatistic?.find(s => s.interactionType?.includes('Watch'))?.userInteractionCount) || 0;
              data.postedAt = videoData.uploadDate;
            }

            // Fallback to DOM scraping
            // Creator
            if (!data.creator) {
              const creatorElement = document.querySelector('span[data-e2e="browse-username"]') ||
                                   document.querySelector('h3[data-e2e="browse-username"]') ||
                                   document.querySelector('a[href*="/@"]');
              if (creatorElement) {
                const creatorText = creatorElement.textContent || creatorElement.getAttribute('href');
                data.creator = '@' + creatorText.replace(/.*@/, '').replace('/', '');
              }
            }

            // Caption
            if (!data.caption) {
              const captionElement = document.querySelector('div[data-e2e="browse-video-desc"]') ||
                                   document.querySelector('span[data-e2e="video-desc"]') ||
                                   document.querySelector('meta[property="og:description"]');
              if (captionElement) {
                data.caption = captionElement.tagName === 'META' ? 
                             captionElement.getAttribute('content') : 
                             captionElement.textContent;
              }
            }

            // Extract hashtags
            if (data.caption) {
              const hashtags = data.caption.match(/#[a-zA-Z0-9_]+/g);
              if (hashtags) {
                data.hashtags = hashtags;
              }
            }

            // Engagement metrics
            const statsElements = document.querySelectorAll('strong[data-e2e*="stats"]');
            statsElements.forEach(el => {
              const value = el.textContent;
              const label = el.getAttribute('data-e2e');
              
              if (label?.includes('like')) {
                data.likes = parseCount(value);
              } else if (label?.includes('comment')) {
                data.comments = parseCount(value);
              } else if (label?.includes('share')) {
                data.shares = parseCount(value);
              }
            });

            // Alternative selectors for stats
            if (!data.likes) {
              const likeElement = document.querySelector('button[aria-label*="like"] span') ||
                                document.querySelector('span[data-e2e="like-count"]');
              if (likeElement) {
                data.likes = parseCount(likeElement.textContent);
              }
            }

            if (!data.comments) {
              const commentElement = document.querySelector('button[aria-label*="comment"] span') ||
                                   document.querySelector('span[data-e2e="comment-count"]');
              if (commentElement) {
                data.comments = parseCount(commentElement.textContent);
              }
            }

            if (!data.shares) {
              const shareElement = document.querySelector('button[aria-label*="share"] span') ||
                                 document.querySelector('span[data-e2e="share-count"]');
              if (shareElement) {
                data.shares = parseCount(shareElement.textContent);
              }
            }

            // Views
            if (!data.views) {
              const viewsElement = document.querySelector('div[data-e2e="video-views"]') ||
                                 document.querySelector('strong:contains("views")');
              if (viewsElement) {
                data.views = parseCount(viewsElement.textContent);
              }
            }

            // Music info
            const musicElement = document.querySelector('a[href*="/music/"]') ||
                               document.querySelector('div[data-e2e="browse-music"]');
            if (musicElement) {
              const musicText = musicElement.textContent;
              if (musicText) {
                const parts = musicText.split(' - ');
                data.musicInfo = {
                  title: parts[0]?.trim(),
                  artist: parts[1]?.trim()
                };
              }
            }

            // Thumbnail
            if (!data.thumbnail) {
              const videoElement = document.querySelector('video');
              if (videoElement) {
                data.thumbnail = videoElement.poster;
              }
              
              if (!data.thumbnail) {
                const ogImage = document.querySelector('meta[property="og:image"]');
                if (ogImage) {
                  data.thumbnail = ogImage.getAttribute('content');
                }
              }
            }

            return data;
          };

          const parseCount = (str) => {
            if (!str) return 0;
            str = str.toUpperCase().replace(/,/g, '');
            if (str.includes('K')) return parseFloat(str) * 1000;
            if (str.includes('M')) return parseFloat(str) * 1000000;
            if (str.includes('B')) return parseFloat(str) * 1000000000;
            return parseInt(str) || 0;
          };

          const result = extractData();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'extraction_complete',
            platform: 'tiktok',
            data: result
          }));
        }, 3000); // Wait 3 seconds for page to load
      } catch (error) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'extraction_error',
          error: error.toString()
        }));
      }
    })();
    true;
  `;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (message.type === 'extraction_complete' && extractionResolve) {
        extractionResolve(message.data);
        setExtractionResolve(null);
        setExtractionReject(null);
        setCurrentUrl('');
      } else if (message.type === 'extraction_error' && extractionReject) {
        extractionReject(new Error(message.error));
        setExtractionResolve(null);
        setExtractionReject(null);
        setCurrentUrl('');
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  const getInjectionScript = (url: string): string => {
    if (url.includes('instagram.com')) {
      return instagramExtractionScript;
    } else if (url.includes('tiktok.com')) {
      return tiktokExtractionScript;
    }
    return '';
  };

  if (!currentUrl) {
    return null;
  }

  return (
    <View style={styles.hiddenContainer}>
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        onMessage={handleMessage}
        injectedJavaScript={getInjectionScript(currentUrl)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
        style={styles.webview}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          if (extractionReject) {
            extractionReject(new Error(`WebView error: ${nativeEvent.description}`));
            setExtractionResolve(null);
            setExtractionReject(null);
            setCurrentUrl('');
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    left: -100,
    top: -100,
  },
  webview: {
    width: 1,
    height: 1,
  },
});

export default PostDataExtractor;
export type { PostDataExtractorRef, PostData };