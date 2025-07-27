// This runs on social media pages when user visits them
// It doesn't automate anything - just helps capture what user sees

class TrendDataExtractor {
  constructor() {
    this.platform = this.detectPlatform();
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('youtube.com')) return 'youtube';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    return 'unknown';
  }

  async extractCurrentPageData() {
    // Only extract data from the page the user is currently viewing
    // No navigation, no automation, just reading the DOM
    
    const data = {
      url: window.location.href,
      platform: this.platform,
      timestamp: new Date().toISOString()
    };

    switch (this.platform) {
      case 'instagram':
        // Instagram example - selectors change frequently
        data.creator_handle = document.querySelector('a[role="link"] span')?.textContent;
        data.post_caption = document.querySelector('h1')?.textContent;
        
        // Find likes - Instagram hides exact counts
        const likesElement = document.querySelector('section span');
        if (likesElement) {
          data.likes_text = likesElement.textContent; // "1,234 likes" or "others"
        }
        break;

      case 'tiktok':
        // TikTok is more open with data
        data.creator_handle = document.querySelector('[data-e2e="browse-username"]')?.textContent;
        data.post_caption = document.querySelector('[data-e2e="browse-video-desc"]')?.textContent;
        data.likes_count = document.querySelector('[data-e2e="like-count"]')?.textContent;
        data.comments_count = document.querySelector('[data-e2e="comment-count"]')?.textContent;
        data.shares_count = document.querySelector('[data-e2e="share-count"]')?.textContent;
        break;

      case 'youtube':
        // YouTube data
        data.creator_name = document.querySelector('#channel-name a')?.textContent?.trim();
        data.video_title = document.querySelector('h1.title')?.textContent?.trim();
        data.views_text = document.querySelector('#count .view-count')?.textContent;
        
        // Like count if visible
        const likeButton = document.querySelector('#top-level-buttons-computed button[aria-label*="like"]');
        if (likeButton) {
          data.likes_text = likeButton.getAttribute('aria-label');
        }
        break;

      case 'twitter':
        // Twitter/X data
        const tweet = document.querySelector('article[data-testid="tweet"]');
        if (tweet) {
          data.creator_handle = tweet.querySelector('[data-testid="User-Name"] span')?.textContent;
          data.post_caption = tweet.querySelector('[data-testid="tweetText"]')?.textContent;
          
          // Engagement metrics
          const metrics = tweet.querySelectorAll('[data-testid$="-count"]');
          metrics.forEach(metric => {
            const label = metric.getAttribute('aria-label');
            if (label) {
              if (label.includes('replies')) data.replies_text = label;
              if (label.includes('retweets')) data.retweets_text = label;
              if (label.includes('likes')) data.likes_text = label;
            }
          });
        }
        break;
    }

    return data;
  }
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const extractor = new TrendDataExtractor();
    extractor.extractCurrentPageData().then(data => {
      sendResponse({ success: true, data });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
});

// Optional: Add a floating button for quick capture
function addCaptureButton() {
  const button = document.createElement('button');
  button.innerHTML = '📸 Capture for WaveSight';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    padding: 10px 20px;
    background: #4F46E5;
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  `;
  
  button.addEventListener('click', async () => {
    const extractor = new TrendDataExtractor();
    const data = await extractor.extractCurrentPageData();
    
    // Send to WaveSight
    chrome.runtime.sendMessage({
      action: 'sendToWaveSight',
      data: data
    });
    
    // Visual feedback
    button.innerHTML = '✅ Captured!';
    setTimeout(() => {
      button.innerHTML = '📸 Capture for WaveSight';
    }, 2000);
  });
  
  document.body.appendChild(button);
}

// Only add button on supported pages with actual content
if (document.readyState === 'complete') {
  setTimeout(addCaptureButton, 1000);
} else {
  window.addEventListener('load', () => setTimeout(addCaptureButton, 1000));
}