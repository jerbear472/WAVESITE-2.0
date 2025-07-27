// Background script - handles communication between extension and WaveSight

// Store captured data temporarily
let capturedTrends = [];

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'captureData':
      handleCapture(request.data);
      break;
      
    case 'quickSubmit':
      handleQuickSubmit(request.data);
      break;
      
    case 'getCapturedTrends':
      sendResponse({ trends: capturedTrends });
      break;
      
    case 'clearCaptured':
      capturedTrends = [];
      updateBadge();
      break;
  }
  
  return true; // Keep message channel open
});

// Handle data capture
function handleCapture(data) {
  // Add to captured trends
  capturedTrends.push({
    ...data,
    id: Date.now().toString(),
    captured_at: new Date().toISOString()
  });
  
  // Update badge
  updateBadge();
  
  // Store in local storage
  chrome.storage.local.set({ capturedTrends });
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon128.png',
    title: 'Trend Captured!',
    message: `Captured ${data.platform} trend from ${data.creator_handle || 'Unknown'}`,
    buttons: [
      { title: 'View Captured' },
      { title: 'Submit Now' }
    ]
  });
}

// Handle quick submit
async function handleQuickSubmit(data) {
  try {
    // Check if user is logged in to WaveSight
    const authToken = await getAuthToken();
    
    if (!authToken) {
      // Open WaveSight login page
      chrome.tabs.create({
        url: 'http://localhost:3000/login?from=extension&return=submit'
      });
      return;
    }
    
    // Submit directly to WaveSight API
    const response = await fetch('http://localhost:3000/api/trends/quick-submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        url: data.url,
        platform: data.platform,
        title: `${data.platform} trend by ${data.creator_handle}`,
        category: detectCategory(data),
        creator_handle: data.creator_handle,
        creator_name: data.creator_name,
        post_caption: data.post_caption || data.video_title,
        likes_count: data.likes_count || 0,
        comments_count: data.comments_count || data.replies_count || 0,
        shares_count: data.shares_count || 0,
        views_count: data.views_count || 0,
        hashtags: data.hashtags || [],
        auto_captured: true
      })
    });
    
    if (response.ok) {
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'Trend Submitted!',
        message: 'Your trend has been submitted to WaveSight',
        buttons: [
          { title: 'View in Timeline' }
        ]
      });
    } else {
      throw new Error('Failed to submit');
    }
  } catch (error) {
    console.error('Quick submit error:', error);
    
    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Submission Failed',
      message: 'Please try again or submit manually',
      buttons: [
        { title: 'Open WaveSight' }
      ]
    });
  }
}

// Detect category based on content
function detectCategory(data) {
  const caption = (data.post_caption || data.video_title || '').toLowerCase();
  const hashtags = (data.hashtags || []).join(' ').toLowerCase();
  const combined = caption + ' ' + hashtags;
  
  // Simple category detection
  if (combined.includes('dance') || combined.includes('choreography')) {
    return 'visual_style';
  } else if (combined.includes('song') || combined.includes('music') || combined.includes('sound')) {
    return 'audio_music';
  } else if (combined.includes('tutorial') || combined.includes('howto') || combined.includes('diy')) {
    return 'creator_technique';
  } else if (combined.includes('meme') || combined.includes('funny') || combined.includes('viral')) {
    return 'meme_format';
  } else if (combined.includes('product') || combined.includes('review') || combined.includes('haul')) {
    return 'product_brand';
  } else {
    return 'behavior_pattern';
  }
}

// Get auth token from WaveSight
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.cookies.get({
      url: 'http://localhost:3000',
      name: 'wavesight-auth-token'
    }, (cookie) => {
      resolve(cookie ? cookie.value : null);
    });
  });
}

// Update extension badge
function updateBadge() {
  const count = capturedTrends.length;
  
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // View captured trends
    chrome.action.openPopup();
  } else if (buttonIndex === 1) {
    // Submit now or open timeline
    chrome.tabs.create({
      url: 'http://localhost:3000/submit'
    });
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  // Load saved trends
  chrome.storage.local.get(['capturedTrends'], (result) => {
    if (result.capturedTrends) {
      capturedTrends = result.capturedTrends;
      updateBadge();
    }
  });
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'capture-trend',
    title: 'Capture Trend for WaveSight',
    contexts: ['page', 'video', 'image'],
    documentUrlPatterns: [
      '*://*.tiktok.com/*',
      '*://*.instagram.com/*',
      '*://*.youtube.com/*',
      '*://*.twitter.com/*',
      '*://*.x.com/*'
    ]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'capture-trend') {
    // Send message to content script to capture
    chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
  }
});