// Enhanced content script with auto-detection and easy capture

class EnhancedTrendCapture {
  constructor() {
    this.platform = this.detectPlatform();
    this.observer = null;
    this.widget = null;
    this.currentData = null;
    this.isInitialized = false;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('youtube.com')) return 'youtube';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    return 'unknown';
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    // Create floating widget
    this.createWidget();
    
    // Start observing for content changes
    this.startObserving();
    
    // Do initial detection
    setTimeout(() => this.detectAndExtract(), 1000);
    
    // Listen for URL changes (for single-page apps)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(() => this.detectAndExtract(), 1000);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  createWidget() {
    // Create floating widget container
    this.widget = document.createElement('div');
    this.widget.id = 'wavesight-capture-widget';
    this.widget.innerHTML = `
      <div class="ws-widget-container">
        <div class="ws-widget-header">
          <span class="ws-logo">🌊</span>
          <span class="ws-title">WaveSight</span>
          <button class="ws-minimize" title="Minimize">−</button>
        </div>
        <div class="ws-widget-body">
          <div class="ws-status">
            <span class="ws-status-icon">⏳</span>
            <span class="ws-status-text">Detecting content...</span>
          </div>
          <div class="ws-data-preview" style="display: none;">
            <div class="ws-data-field">
              <label>Creator:</label>
              <span class="ws-creator"></span>
            </div>
            <div class="ws-data-field">
              <label>Engagement:</label>
              <div class="ws-engagement">
                <span class="ws-likes">-</span>
                <span class="ws-comments">-</span>
                <span class="ws-shares">-</span>
                <span class="ws-views">-</span>
              </div>
            </div>
            <div class="ws-data-field">
              <label>Caption:</label>
              <div class="ws-caption"></div>
            </div>
          </div>
          <div class="ws-actions" style="display: none;">
            <button class="ws-capture-btn">
              <span class="ws-capture-icon">📸</span>
              Capture This Trend
            </button>
            <button class="ws-quick-submit">
              <span class="ws-submit-icon">🚀</span>
              Quick Submit
            </button>
          </div>
        </div>
        <div class="ws-minimized" style="display: none;">
          <span class="ws-logo">🌊</span>
          <span class="ws-badge" style="display: none;">1</span>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #wavesight-capture-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .ws-widget-container {
        background: rgba(17, 24, 39, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        width: 320px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        transition: all 0.3s ease;
      }
      
      .ws-widget-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        cursor: move;
      }
      
      .ws-logo {
        font-size: 20px;
        margin-right: 8px;
      }
      
      .ws-title {
        color: #fff;
        font-weight: 600;
        font-size: 14px;
        flex: 1;
      }
      
      .ws-minimize {
        background: transparent;
        border: none;
        color: #9CA3AF;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }
      
      .ws-minimize:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .ws-widget-body {
        padding: 16px;
      }
      
      .ws-status {
        display: flex;
        align-items: center;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin-bottom: 12px;
      }
      
      .ws-status-icon {
        font-size: 20px;
        margin-right: 8px;
      }
      
      .ws-status-text {
        color: #D1D5DB;
        font-size: 13px;
      }
      
      .ws-status.detected {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
      }
      
      .ws-status.detected .ws-status-icon {
        content: '✅';
      }
      
      .ws-status.detected .ws-status-text {
        color: #10B981;
      }
      
      .ws-data-preview {
        margin-bottom: 16px;
      }
      
      .ws-data-field {
        margin-bottom: 12px;
      }
      
      .ws-data-field label {
        display: block;
        color: #9CA3AF;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      
      .ws-creator {
        color: #fff;
        font-weight: 500;
      }
      
      .ws-engagement {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      
      .ws-engagement span {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #fff;
        font-size: 13px;
      }
      
      .ws-engagement span::before {
        font-size: 14px;
      }
      
      .ws-likes::before { content: '❤️'; }
      .ws-comments::before { content: '💬'; }
      .ws-shares::before { content: '🔄'; }
      .ws-views::before { content: '👁️'; }
      
      .ws-caption {
        color: #E5E7EB;
        font-size: 13px;
        line-height: 1.4;
        max-height: 60px;
        overflow-y: auto;
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
      }
      
      .ws-actions {
        display: flex;
        gap: 8px;
      }
      
      .ws-capture-btn, .ws-quick-submit {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      
      .ws-capture-btn {
        background: #4F46E5;
        color: white;
      }
      
      .ws-capture-btn:hover {
        background: #4338CA;
      }
      
      .ws-quick-submit {
        background: rgba(16, 185, 129, 0.1);
        color: #10B981;
        border: 1px solid rgba(16, 185, 129, 0.2);
      }
      
      .ws-quick-submit:hover {
        background: rgba(16, 185, 129, 0.2);
      }
      
      .ws-minimized {
        padding: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .ws-badge {
        background: #EF4444;
        color: white;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
      }
      
      /* Minimized state */
      .ws-widget-container.minimized .ws-widget-header,
      .ws-widget-container.minimized .ws-widget-body {
        display: none;
      }
      
      .ws-widget-container.minimized .ws-minimized {
        display: flex !important;
      }
      
      .ws-widget-container.minimized {
        width: auto;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(this.widget);
    
    // Add event listeners
    this.setupWidgetEvents();
  }

  setupWidgetEvents() {
    const minimizeBtn = this.widget.querySelector('.ws-minimize');
    const minimizedView = this.widget.querySelector('.ws-minimized');
    const container = this.widget.querySelector('.ws-widget-container');
    const captureBtn = this.widget.querySelector('.ws-capture-btn');
    const quickSubmitBtn = this.widget.querySelector('.ws-quick-submit');
    
    // Minimize/maximize
    minimizeBtn.addEventListener('click', () => {
      container.classList.add('minimized');
    });
    
    minimizedView.addEventListener('click', () => {
      container.classList.remove('minimized');
    });
    
    // Capture button
    captureBtn.addEventListener('click', () => this.captureData());
    
    // Quick submit button
    quickSubmitBtn.addEventListener('click', () => this.quickSubmit());
    
    // Make widget draggable
    this.makeWidgetDraggable();
  }

  makeWidgetDraggable() {
    const header = this.widget.querySelector('.ws-widget-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      if (e.target.closest('.ws-widget-header') && !e.target.closest('.ws-minimize')) {
        isDragging = true;
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        
        const widget = document.getElementById('wavesight-capture-widget');
        widget.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    }

    function dragEnd(e) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    }
  }

  startObserving() {
    // Observe DOM changes to detect when new content loads
    this.observer = new MutationObserver((mutations) => {
      // Debounce to avoid too many extractions
      clearTimeout(this.extractTimeout);
      this.extractTimeout = setTimeout(() => {
        this.detectAndExtract();
      }, 500);
    });
    
    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'data-e2e']
    });
  }

  async detectAndExtract() {
    const data = await this.extractPageData();
    
    if (data && this.isValidPost(data)) {
      this.currentData = data;
      this.updateWidget(data);
    } else {
      this.updateWidgetStatus('No post detected', '🔍');
    }
  }

  isValidPost(data) {
    // Check if we have meaningful data
    return data && (
      data.creator_handle || 
      data.post_caption || 
      data.likes_count > 0 ||
      data.views_count > 0
    );
  }

  async extractPageData() {
    const extractors = {
      tiktok: () => this.extractTikTokData(),
      instagram: () => this.extractInstagramData(),
      youtube: () => this.extractYouTubeData(),
      twitter: () => this.extractTwitterData()
    };
    
    const extractor = extractors[this.platform];
    if (!extractor) return null;
    
    try {
      const data = await extractor();
      return {
        ...data,
        url: window.location.href,
        platform: this.platform,
        extracted_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Extraction error:', error);
      return null;
    }
  }

  extractTikTokData() {
    const data = {};
    
    // Wait for video player to be visible
    const videoContainer = document.querySelector('[class*="DivVideoContainer"]');
    if (!videoContainer) return null;
    
    // Creator handle - multiple possible selectors
    const creatorSelectors = [
      '[data-e2e="browse-username"]',
      'a[href*="/@"] h3',
      '[class*="AuthorTitle"] [class*="StyledLink"]',
      'span[class*="SpanUniqueId"]'
    ];
    
    for (const selector of creatorSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        data.creator_handle = element.textContent.trim();
        break;
      }
    }
    
    // Video description/caption
    const captionSelectors = [
      '[data-e2e="browse-video-desc"]',
      '[class*="DivVideoInfoContainer"] span:not([class*="music"])',
      '[data-e2e="video-desc"]'
    ];
    
    for (const selector of captionSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        data.post_caption = element.textContent.trim();
        break;
      }
    }
    
    // Engagement metrics - TikTok shows these clearly
    const metrics = [
      { key: 'likes_count', selectors: ['[data-e2e="like-count"]', '[class*="StrongLike"]'] },
      { key: 'comments_count', selectors: ['[data-e2e="comment-count"]', '[class*="StrongComment"]'] },
      { key: 'shares_count', selectors: ['[data-e2e="share-count"]', '[class*="StrongShare"]'] },
      { key: 'views_count', selectors: ['[data-e2e="play-count"]', '[class*="StrongPlay"]'] }
    ];
    
    metrics.forEach(({ key, selectors }) => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          data[key] = this.parseCount(element.textContent);
          break;
        }
      }
    });
    
    // Extract hashtags from caption
    if (data.post_caption) {
      const hashtags = data.post_caption.match(/#\w+/g);
      if (hashtags) {
        data.hashtags = hashtags.map(tag => tag.substring(1));
      }
    }
    
    return data;
  }

  extractInstagramData() {
    const data = {};
    
    // Check if we're on a post page
    if (!window.location.pathname.includes('/p/') && !window.location.pathname.includes('/reel/')) {
      return null;
    }
    
    // Creator handle - Instagram is tricky, they obfuscate classes
    const creatorSelectors = [
      'header a[href^="/"]:not([href="/"])',
      'a[role="link"] span',
      'article header a span'
    ];
    
    for (const selector of creatorSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent && !element.textContent.includes('Follow')) {
        data.creator_handle = element.textContent.trim();
        break;
      }
    }
    
    // Post caption - usually in article
    const article = document.querySelector('article[role="presentation"], article');
    if (article) {
      // Look for caption in various possible locations
      const captionSelectors = [
        'h1',
        '[role="button"] span',
        'ul li[role="menuitem"] span'
      ];
      
      for (const selector of captionSelectors) {
        const elements = article.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent?.trim();
          if (text && text.length > 20 && !text.includes('Follow') && !text.includes('Share')) {
            data.post_caption = text;
            break;
          }
        }
        if (data.post_caption) break;
      }
    }
    
    // Likes - Instagram sometimes shows exact count
    const likeSelectors = [
      'section a[href*="/liked_by/"] span',
      'section button span',
      'a[href*="/liked_by/"]'
    ];
    
    for (const selector of likeSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent && (element.textContent.includes('like') || /^\d/.test(element.textContent))) {
        data.likes_text = element.textContent.trim();
        data.likes_count = this.parseCount(element.textContent);
        break;
      }
    }
    
    // Comments count - look for "View all X comments"
    const commentElements = document.querySelectorAll('a[href*="#comments"]');
    for (const element of commentElements) {
      const text = element.textContent;
      if (text && text.includes('comment')) {
        const match = text.match(/(\d+[\d,]*)/);
        if (match) {
          data.comments_count = this.parseCount(match[1]);
        }
      }
    }
    
    // Extract hashtags
    if (data.post_caption) {
      const hashtags = data.post_caption.match(/#\w+/g);
      if (hashtags) {
        data.hashtags = hashtags.map(tag => tag.substring(1));
      }
    }
    
    return data;
  }

  extractYouTubeData() {
    const data = {};
    
    // Check if we're on a video page
    if (!window.location.pathname.includes('/watch')) return null;
    
    // Video title
    const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer, h1.title');
    if (titleElement) {
      data.video_title = titleElement.textContent.trim();
      data.post_caption = data.video_title;
    }
    
    // Channel name
    const channelSelectors = [
      '#channel-name a',
      '#owner #text a',
      'ytd-channel-name a',
      '#upload-info a'
    ];
    
    for (const selector of channelSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        data.creator_name = element.textContent.trim();
        data.creator_handle = `@${data.creator_name.replace(/\s+/g, '')}`;
        break;
      }
    }
    
    // View count
    const viewSelectors = [
      '.view-count',
      'span.yt-view-count-renderer',
      '#count .ytd-video-view-count-renderer'
    ];
    
    for (const selector of viewSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent && element.textContent.includes('view')) {
        data.views_text = element.textContent.trim();
        data.views_count = this.parseCount(element.textContent);
        break;
      }
    }
    
    // Like count - from button aria-label
    const likeButton = document.querySelector('#top-level-buttons-computed button[aria-label*="like"]');
    if (likeButton) {
      const ariaLabel = likeButton.getAttribute('aria-label');
      if (ariaLabel) {
        const match = ariaLabel.match(/[\d,]+/);
        if (match) {
          data.likes_count = this.parseCount(match[0]);
        }
      }
    }
    
    // Description for hashtags
    const descriptionElement = document.querySelector('#description-text, ytd-text-inline-expander');
    if (descriptionElement) {
      const hashtags = descriptionElement.textContent.match(/#\w+/g);
      if (hashtags) {
        data.hashtags = hashtags.map(tag => tag.substring(1));
      }
    }
    
    return data;
  }

  extractTwitterData() {
    const data = {};
    
    // Find the main tweet
    const tweet = document.querySelector('article[data-testid="tweet"]');
    if (!tweet) return null;
    
    // Creator handle
    const handleElement = tweet.querySelector('[data-testid="User-Name"] a[href^="/"]');
    if (handleElement) {
      data.creator_handle = handleElement.textContent.trim();
    }
    
    // Tweet text
    const tweetText = tweet.querySelector('[data-testid="tweetText"]');
    if (tweetText) {
      data.post_caption = tweetText.textContent.trim();
      
      // Extract hashtags
      const hashtags = data.post_caption.match(/#\w+/g);
      if (hashtags) {
        data.hashtags = hashtags.map(tag => tag.substring(1));
      }
    }
    
    // Engagement metrics from aria-labels
    const metrics = [
      { key: 'replies_count', test: 'replies' },
      { key: 'shares_count', test: 'Retweets' },
      { key: 'likes_count', test: 'Likes' },
      { key: 'views_count', test: 'Views' }
    ];
    
    metrics.forEach(({ key, test }) => {
      const element = tweet.querySelector(`[aria-label*="${test}"]`);
      if (element) {
        const ariaLabel = element.getAttribute('aria-label');
        const match = ariaLabel.match(/[\d,]+/);
        if (match) {
          data[key] = this.parseCount(match[0]);
        }
      }
    });
    
    return data;
  }

  parseCount(text) {
    if (!text) return 0;
    
    // Remove commas and convert K, M, B
    text = text.replace(/,/g, '');
    
    const multipliers = {
      'K': 1000,
      'M': 1000000,
      'B': 1000000000
    };
    
    for (const [suffix, multiplier] of Object.entries(multipliers)) {
      if (text.toUpperCase().includes(suffix)) {
        const number = parseFloat(text);
        return Math.round(number * multiplier);
      }
    }
    
    // Try to parse as regular number
    const parsed = parseInt(text);
    return isNaN(parsed) ? 0 : parsed;
  }

  formatCount(count) {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  }

  updateWidget(data) {
    const statusEl = this.widget.querySelector('.ws-status');
    const statusIcon = this.widget.querySelector('.ws-status-icon');
    const statusText = this.widget.querySelector('.ws-status-text');
    const preview = this.widget.querySelector('.ws-data-preview');
    const actions = this.widget.querySelector('.ws-actions');
    
    // Update status
    statusEl.classList.add('detected');
    statusIcon.textContent = '✅';
    statusText.textContent = 'Trend detected!';
    
    // Update preview data
    this.widget.querySelector('.ws-creator').textContent = data.creator_handle || 'Unknown';
    this.widget.querySelector('.ws-likes').textContent = this.formatCount(data.likes_count);
    this.widget.querySelector('.ws-comments').textContent = this.formatCount(data.comments_count || data.replies_count);
    this.widget.querySelector('.ws-shares').textContent = this.formatCount(data.shares_count);
    this.widget.querySelector('.ws-views').textContent = this.formatCount(data.views_count);
    
    const captionEl = this.widget.querySelector('.ws-caption');
    captionEl.textContent = data.post_caption || data.video_title || 'No caption';
    
    // Show preview and actions
    preview.style.display = 'block';
    actions.style.display = 'flex';
    
    // Update badge
    const badge = this.widget.querySelector('.ws-badge');
    badge.style.display = 'block';
    badge.textContent = '1';
  }

  updateWidgetStatus(text, icon = '⏳') {
    const statusEl = this.widget.querySelector('.ws-status');
    const statusIcon = this.widget.querySelector('.ws-status-icon');
    const statusText = this.widget.querySelector('.ws-status-text');
    const preview = this.widget.querySelector('.ws-data-preview');
    const actions = this.widget.querySelector('.ws-actions');
    
    statusEl.classList.remove('detected');
    statusIcon.textContent = icon;
    statusText.textContent = text;
    preview.style.display = 'none';
    actions.style.display = 'none';
    
    const badge = this.widget.querySelector('.ws-badge');
    badge.style.display = 'none';
  }

  async captureData() {
    if (!this.currentData) return;
    
    const captureBtn = this.widget.querySelector('.ws-capture-btn');
    captureBtn.disabled = true;
    captureBtn.innerHTML = '<span>✅</span> Captured!';
    
    // Send to extension background
    chrome.runtime.sendMessage({
      action: 'captureData',
      data: this.currentData
    });
    
    // Show success
    setTimeout(() => {
      captureBtn.disabled = false;
      captureBtn.innerHTML = '<span class="ws-capture-icon">📸</span> Capture This Trend';
    }, 2000);
  }

  async quickSubmit() {
    if (!this.currentData) return;
    
    const submitBtn = this.widget.querySelector('.ws-quick-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳</span> Submitting...';
    
    // Send to WaveSight with auto-submit flag
    chrome.runtime.sendMessage({
      action: 'quickSubmit',
      data: this.currentData
    });
    
    // Show success
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>✅</span> Submitted!';
      
      setTimeout(() => {
        submitBtn.innerHTML = '<span class="ws-submit-icon">🚀</span> Quick Submit';
      }, 2000);
    }, 1000);
  }
}

// Initialize the enhanced capture system
const trendCapture = new EnhancedTrendCapture();