// Debug the EXACT category issue
// Run this in browser console on your Vercel app

// 1. Intercept the exact data being sent
const _fetch = window.fetch;
window.fetch = async function(...args) {
  const url = args[0]?.toString() || '';
  
  // Check if this is a Supabase request
  if (url.includes('supabase') && args[1]?.body) {
    try {
      const body = JSON.parse(args[1].body);
      console.log('🔴 FULL REQUEST TO SUPABASE:', {
        url: url,
        method: args[1].methoda,
        body: body
      });
      
      // Specifically log the category
      if (body.category !== undefined) {
        console.log('📍 CATEGORY VALUE:', body.category);
        console.log('📍 CATEGORY TYPE:', typeof body.category);
      }
    } catch (e) {}
  }
  
  try {
    const response = await _fetch.apply(this, args);
    
    // Log error responses
    if (!response.ok && url.includes('supabase')) {
      const text = await response.clone().text();
      console.log('❌ SUPABASE ERROR RESPONSE:', {
        status: response.status,
        statusText: response.statusText,
        body: text,
        url: url
      });
      
      // Try to parse error
      try {
        const error = JSON.parse(text);
        if (error.message) {
          console.log('🚨 ERROR MESSAGE:', error.message);
          if (error.code) console.log('🚨 ERROR CODE:', error.code);
          if (error.details) console.log('🚨 ERROR DETAILS:', error.details);
        }
      } catch (e) {}
    }
    
    return response;
  } catch (error) {
    console.error('❌ FETCH ERROR:', error);
    throw error;
  }
};

// 2. Also check what's in the form
setTimeout(() => {
  // Find category selects or inputs
  const categoryElements = document.querySelectorAll('[name*="category"], [id*="category"], select, input[type="checkbox"]');
  console.log('📋 Found form elements:', categoryElements.length);
  
  categoryElements.forEach(el => {
    if (el.value || el.checked) {
      console.log('Form element:', {
        name: el.name || el.id,
        value: el.value,
        checked: el.checked,
        tagName: el.tagName
      });
    }
  });
}, 1000);

console.log('✅ Debug active! Now submit a trend and watch the console.');
console.log('The EXACT error and data will be shown.');