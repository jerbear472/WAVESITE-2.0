// Popup script - handles user interaction

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const captureBtn = document.getElementById('captureBtn');
  const dataPreviewEl = document.getElementById('dataPreview');
  const dataContentEl = document.getElementById('dataContent');
  
  // Check if we're on a supported page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const supportedSites = ['tiktok.com', 'instagram.com', 'youtube.com', 'twitter.com', 'x.com'];
  const isSupported = supportedSites.some(site => tab.url.includes(site));
  
  if (isSupported) {
    statusEl.className = 'status ready';
    statusEl.textContent = '✅ Ready to capture from this page';
    captureBtn.disabled = false;
  } else {
    statusEl.className = 'status not-ready';
    statusEl.textContent = '❌ Please navigate to a social media post';
    captureBtn.disabled = true;
  }
  
  // Handle capture button click
  captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;
    captureBtn.textContent = 'Capturing...';
    
    try {
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
      
      if (response.success) {
        // Show captured data
        displayData(response.data);
        
        // Send to WaveSight (would need to implement this)
        await sendToWaveSight(response.data);
        
        captureBtn.textContent = '✅ Captured!';
        setTimeout(() => {
          captureBtn.textContent = 'Capture This Post';
          captureBtn.disabled = false;
        }, 2000);
      } else {
        throw new Error(response.error || 'Failed to capture data');
      }
    } catch (error) {
      console.error('Capture error:', error);
      captureBtn.textContent = '❌ Error';
      statusEl.textContent = 'Error: ' + error.message;
      statusEl.className = 'status not-ready';
      
      setTimeout(() => {
        captureBtn.textContent = 'Capture This Post';
        captureBtn.disabled = false;
      }, 2000);
    }
  });
  
  function displayData(data) {
    dataPreviewEl.style.display = 'block';
    
    // Format the data for display
    let html = '';
    
    if (data.platform) {
      html += `<div class="data-field"><strong>Platform:</strong> ${data.platform}</div>`;
    }
    if (data.creator_handle) {
      html += `<div class="data-field"><strong>Creator:</strong> ${data.creator_handle}</div>`;
    }
    if (data.post_caption) {
      html += `<div class="data-field"><strong>Caption:</strong> ${data.post_caption.substring(0, 100)}...</div>`;
    }
    if (data.likes_count || data.likes_text) {
      html += `<div class="data-field"><strong>Likes:</strong> ${data.likes_count || data.likes_text}</div>`;
    }
    if (data.comments_count) {
      html += `<div class="data-field"><strong>Comments:</strong> ${data.comments_count}</div>`;
    }
    if (data.views_count || data.views_text) {
      html += `<div class="data-field"><strong>Views:</strong> ${data.views_count || data.views_text}</div>`;
    }
    
    dataContentEl.innerHTML = html;
  }
  
  async function sendToWaveSight(data) {
    // This would send the data to your WaveSight app
    // For now, we'll just log it
    console.log('Would send to WaveSight:', data);
    
    // In production, you'd do something like:
    // await fetch('https://wavesight.app/api/capture', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });
  }
});