// Test trend submission on production - Version 2
// This version finds the Supabase client in your app

async function testTrendSubmissionV2() {
  console.log('🧪 Testing Trend Submission on Production V2');
  console.log('===========================================');
  
  // Find Supabase client
  let supabaseClient = null;
  
  // Method 1: Check window object
  if (window.supabase) {
    supabaseClient = window.supabase;
    console.log('✅ Found supabase on window');
  } 
  // Method 2: Check for __NEXT_DATA__ (Next.js apps)
  else if (window.__supabase) {
    supabaseClient = window.__supabase;
    console.log('✅ Found supabase on window.__supabase');
  }
  // Method 3: Try to get from React context (if using React DevTools)
  else {
    console.log('❌ Supabase client not found in global scope');
    console.log('Trying alternative method...');
    
    // Look for Supabase in the app
    const scripts = document.querySelectorAll('script');
    for (let script of scripts) {
      if (script.innerHTML.includes('createClient') && script.innerHTML.includes('supabase')) {
        console.log('📍 Found Supabase initialization in scripts');
        break;
      }
    }
    
    console.log('\n🔧 Manual Test Instructions:');
    console.log('1. Open the Network tab in DevTools');
    console.log('2. Try to submit a trend in the form');
    console.log('3. Look for the failed request to Supabase');
    console.log('4. Check the error message in the response');
    return;
  }
  
  // If we found Supabase, continue with tests
  if (supabaseClient) {
    const supabase = supabaseClient;
    
    // Test authentication
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (user) {
        console.log('✅ Authenticated as:', user.email);
        console.log('User ID:', user.id);
        
        // Quick test query
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('❌ Profile query error:', error);
        } else {
          console.log('✅ Profile found:', data);
        }
      } else {
        console.error('❌ Not authenticated');
      }
    } catch (e) {
      console.error('❌ Error accessing Supabase:', e);
    }
  }
}

// Alternative: Direct API test
async function testSupabaseAPI() {
  console.log('\n🔌 Testing Supabase API directly...');
  
  // Get the Supabase URL from the page
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
    document.querySelector('script')?.innerHTML.match(/https:\/\/\w+\.supabase\.co/)?.[0];
  
  if (supabaseUrl) {
    console.log('Found Supabase URL:', supabaseUrl);
    
    // Test the API endpoint
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=count`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ Supabase API is accessible');
      } else {
        console.error('❌ Supabase API error:', response.status);
      }
    } catch (e) {
      console.error('❌ API test failed:', e);
    }
  }
}

// Inspect form for debugging
function inspectTrendForm() {
  console.log('\n🔍 Inspecting Trend Submission Form...');
  
  // Find form elements
  const forms = document.querySelectorAll('form');
  console.log(`Found ${forms.length} forms on page`);
  
  // Look for trend-related inputs
  const inputs = document.querySelectorAll('input[name*="trend"], input[placeholder*="trend"], textarea');
  console.log(`Found ${inputs.length} potential trend inputs`);
  
  // Look for submit buttons
  const submitButtons = document.querySelectorAll('button[type="submit"], button:contains("Submit")');
  console.log(`Found ${submitButtons.length} submit buttons`);
  
  // Check for React props
  if (window.React || window._react) {
    console.log('✅ React detected');
  }
  
  return {
    forms: forms.length,
    inputs: inputs.length,
    buttons: submitButtons.length
  };
}

// Run all tests
console.log('Running diagnostics...\n');
testTrendSubmissionV2();
testSupabaseAPI();
const formInfo = inspectTrendForm();

console.log('\n📋 SUMMARY:');
console.log('If Supabase client not found globally, the app likely uses it internally.');
console.log('Check the Network tab when submitting to see the actual error.');
console.log('Form elements found:', formInfo);