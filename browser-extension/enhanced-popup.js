// Enhanced popup script

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active states
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${targetTab}-tab`) {
          content.classList.add('active');
        }
      });
    });
  });
  
  // Load captured trends
  loadCapturedTrends();
  
  // Open WaveSight button
  document.getElementById('open-wavesight').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });
  
  // Settings toggles
  setupSettings();
  
  // Check connection status
  checkConnection();
});

async function loadCapturedTrends() {
  // Get captured trends from background
  const response = await chrome.runtime.sendMessage({ action: 'getCapturedTrends' });
  const trends = response.trends || [];
  
  const container = document.getElementById('captured-container');
  
  if (trends.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📸</div>
        <h3>No captured trends yet</h3>
        <p>Browse social media and capture trending content</p>
      </div>
    `;
    return;
  }
  
  // Create captured list
  const list = document.createElement('div');
  list.className = 'captured-list';
  
  trends.forEach(trend => {
    const item = createTrendItem(trend);
    list.appendChild(item);
  });
  
  container.innerHTML = '';
  container.appendChild(list);
  
  // Add clear all button
  if (trends.length > 0) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-secondary';
    clearBtn.style.width = '100%';
    clearBtn.innerHTML = '<span>🗑️</span> Clear All';
    clearBtn.addEventListener('click', clearAllTrends);
    container.appendChild(clearBtn);
  }
}

function createTrendItem(trend) {
  const item = document.createElement('div');
  item.className = 'captured-item';
  
  // Format engagement numbers
  const formatCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };
  
  // Platform icons
  const platformIcons = {
    tiktok: '🎵',
    instagram: '📷',
    youtube: '📺',
    twitter: '🐦'
  };
  
  item.innerHTML = `
    <div class="item-header">
      <div>
        <span class="platform-badge ${trend.platform}">
          ${platformIcons[trend.platform] || '🌐'} ${trend.platform}
        </span>
      </div>
      <div style="font-size: 12px; color: #64748B;">
        ${new Date(trend.captured_at).toLocaleTimeString()}
      </div>
    </div>
    
    <div style="font-weight: 500; margin-bottom: 4px;">
      ${trend.creator_handle || 'Unknown Creator'}
    </div>
    
    <div class="item-stats">
      ${trend.likes_count ? `<span class="stat">❤️ ${formatCount(trend.likes_count)}</span>` : ''}
      ${trend.comments_count || trend.replies_count ? `<span class="stat">💬 ${formatCount(trend.comments_count || trend.replies_count)}</span>` : ''}
      ${trend.shares_count ? `<span class="stat">🔄 ${formatCount(trend.shares_count)}</span>` : ''}
      ${trend.views_count ? `<span class="stat">👁️ ${formatCount(trend.views_count)}</span>` : ''}
    </div>
    
    ${trend.post_caption || trend.video_title ? `
      <div class="item-caption">
        ${(trend.post_caption || trend.video_title).substring(0, 100)}${(trend.post_caption || trend.video_title).length > 100 ? '...' : ''}
      </div>
    ` : ''}
    
    <div class="item-actions">
      <button class="btn btn-primary btn-submit-single" data-trend-id="${trend.id}">
        <span>🚀</span> Submit
      </button>
      <button class="btn btn-secondary btn-view" data-url="${trend.url}">
        <span>🔗</span> View
      </button>
      <button class="btn btn-secondary btn-remove" data-trend-id="${trend.id}">
        <span>❌</span>
      </button>
    </div>
  `;
  
  // Add event listeners
  item.querySelector('.btn-submit-single').addEventListener('click', (e) => {
    submitSingleTrend(trend);
  });
  
  item.querySelector('.btn-view').addEventListener('click', (e) => {
    chrome.tabs.create({ url: trend.url });
  });
  
  item.querySelector('.btn-remove').addEventListener('click', (e) => {
    removeTrend(trend.id);
  });
  
  return item;
}

async function submitSingleTrend(trend) {
  showStatus('Submitting trend...', 'info');
  
  // Open WaveSight submit page with pre-filled data
  const params = new URLSearchParams({
    url: trend.url,
    platform: trend.platform,
    creator: trend.creator_handle || '',
    caption: trend.post_caption || trend.video_title || '',
    likes: trend.likes_count || 0,
    comments: trend.comments_count || trend.replies_count || 0,
    shares: trend.shares_count || 0,
    views: trend.views_count || 0,
    auto: 'true'
  });
  
  chrome.tabs.create({
    url: `http://localhost:3000/submit?${params.toString()}`
  });
}

async function removeTrend(trendId) {
  // Remove from background storage
  const response = await chrome.runtime.sendMessage({ action: 'getCapturedTrends' });
  const trends = response.trends || [];
  const updatedTrends = trends.filter(t => t.id !== trendId);
  
  // Save updated list
  chrome.storage.local.set({ capturedTrends: updatedTrends });
  
  // Update badge
  chrome.runtime.sendMessage({ 
    action: 'updateTrends', 
    trends: updatedTrends 
  });
  
  // Reload list
  loadCapturedTrends();
  showStatus('Trend removed', 'success');
}

async function clearAllTrends() {
  if (confirm('Clear all captured trends?')) {
    chrome.runtime.sendMessage({ action: 'clearCaptured' });
    loadCapturedTrends();
    showStatus('All trends cleared', 'success');
  }
}

function setupSettings() {
  // Load saved settings
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {
      showWidget: true,
      autoDetect: true,
      notifications: true
    };
    
    // Update toggles
    document.getElementById('widget-toggle').classList.toggle('active', settings.showWidget);
    document.getElementById('auto-detect-toggle').classList.toggle('active', settings.autoDetect);
    document.getElementById('notifications-toggle').classList.toggle('active', settings.notifications);
  });
  
  // Handle toggle clicks
  document.querySelectorAll('.toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      saveSettings();
    });
  });
}

function saveSettings() {
  const settings = {
    showWidget: document.getElementById('widget-toggle').classList.contains('active'),
    autoDetect: document.getElementById('auto-detect-toggle').classList.contains('active'),
    notifications: document.getElementById('notifications-toggle').classList.contains('active')
  };
  
  chrome.storage.local.set({ settings });
}

async function checkConnection() {
  const statusEl = document.getElementById('connection-status');
  
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      statusEl.innerHTML = '✅ Connected to WaveSight';
      statusEl.style.background = '#065F46';
      statusEl.style.color = '#D1FAE5';
    } else {
      throw new Error('Not connected');
    }
  } catch (error) {
    statusEl.innerHTML = '❌ WaveSight not running. Start local server.';
    statusEl.style.background = '#7F1D1D';
    statusEl.style.color = '#FEE2E2';
  }
}

function showStatus(message, type = 'success') {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.style.display = 'block';
  statusEl.style.background = type === 'success' ? '#065F46' : '#1E3A8A';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}