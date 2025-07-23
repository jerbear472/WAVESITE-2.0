/**
 * WebView-based extraction service
 * This approach uses an invisible WebView to load the page and extract data
 * More reliable for dynamic content but requires WebView component
 */

interface ExtractedContent {
  creator?: string;
  caption?: string;
  likes?: string;
  comments?: string;
  shares?: string;
  views?: string;
}

class WebViewExtractorService {
  /**
   * JavaScript to inject into WebView for extracting TikTok data
   */
  static getTikTokExtractionScript(): string {
    return `
      (function() {
        try {
          const data = {};
          
          // Try to get creator
          const creatorElement = document.querySelector('[data-e2e="browse-username"]') || 
                                document.querySelector('span.tiktok-1r8gltq-SpanUniqueId');
          if (creatorElement) {
            data.creator = creatorElement.textContent;
          }
          
          // Try to get caption/description
          const captionElement = document.querySelector('[data-e2e="browse-video-desc"]') ||
                                document.querySelector('div.tiktok-1ejylhp-DivContainer');
          if (captionElement) {
            data.caption = captionElement.textContent;
          }
          
          // Try to get likes
          const likesElement = document.querySelector('[data-e2e="browse-like-count"]') ||
                              document.querySelector('strong[data-e2e="like-count"]');
          if (likesElement) {
            data.likes = likesElement.textContent;
          }
          
          // Try to get comments
          const commentsElement = document.querySelector('[data-e2e="browse-comment-count"]') ||
                                 document.querySelector('strong[data-e2e="comment-count"]');
          if (commentsElement) {
            data.comments = commentsElement.textContent;
          }
          
          // Try to get shares
          const sharesElement = document.querySelector('[data-e2e="share-count"]');
          if (sharesElement) {
            data.shares = sharesElement.textContent;
          }
          
          // Send data back
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'extraction-complete',
            data: data
          }));
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'extraction-error',
            error: error.message
          }));
        }
      })();
    `;
  }
  
  /**
   * JavaScript to inject into WebView for extracting Instagram data
   */
  static getInstagramExtractionScript(): string {
    return `
      (function() {
        try {
          const data = {};
          
          // Try to get creator from various possible locations
          const creatorElement = document.querySelector('a.x1i10hfl span') ||
                                document.querySelector('header a[role="link"] span');
          if (creatorElement) {
            data.creator = '@' + creatorElement.textContent;
          }
          
          // Try to get caption
          const captionElement = document.querySelector('h1._aacl') ||
                                document.querySelector('span._aade');
          if (captionElement) {
            data.caption = captionElement.textContent;
          }
          
          // Try to get likes (Instagram hides exact counts)
          const likesElement = document.querySelector('section span._aacl');
          if (likesElement && likesElement.textContent.includes('like')) {
            data.likes = likesElement.textContent;
          }
          
          // Send data back
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'extraction-complete',
            data: data
          }));
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'extraction-error',
            error: error.message
          }));
        }
      })();
    `;
  }
  
  /**
   * Convert engagement text to number
   * e.g., "1.2M" -> 1200000, "5.5K" -> 5500
   */
  static parseEngagementNumber(text: string): number {
    if (!text) return 0;
    
    const cleanText = text.replace(/[^0-9.KMB]/gi, '');
    
    if (cleanText.includes('K')) {
      return parseFloat(cleanText.replace('K', '')) * 1000;
    } else if (cleanText.includes('M')) {
      return parseFloat(cleanText.replace('M', '')) * 1000000;
    } else if (cleanText.includes('B')) {
      return parseFloat(cleanText.replace('B', '')) * 1000000000;
    }
    
    return parseInt(cleanText) || 0;
  }
  
  /**
   * Get the appropriate extraction script based on platform
   */
  static getExtractionScript(url: string): string {
    if (url.includes('tiktok.com')) {
      return this.getTikTokExtractionScript();
    } else if (url.includes('instagram.com')) {
      return this.getInstagramExtractionScript();
    }
    
    // Default script that tries to extract basic metadata
    return `
      (function() {
        try {
          const data = {};
          
          // Try Open Graph tags
          const ogTitle = document.querySelector('meta[property="og:title"]');
          if (ogTitle) {
            data.caption = ogTitle.content;
          }
          
          // Try to find any creator info
          const authorMeta = document.querySelector('meta[name="author"]') ||
                            document.querySelector('meta[property="article:author"]');
          if (authorMeta) {
            data.creator = authorMeta.content;
          }
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'extraction-complete',
            data: data
          }));
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'extraction-error',
            error: error.message
          }));
        }
      })();
    `;
  }
}

export default WebViewExtractorService;