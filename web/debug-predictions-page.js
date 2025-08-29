const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPredictionsPage() {
  console.log('🔍 Debugging Predictions Page Data\n');
  console.log('=' .repeat(60));
  
  try {
    // Check what statuses we're looking for
    console.log('The predictions page loads trends with these statuses:');
    console.log("['submitted', 'validated', 'validating', 'approved']\n");
    
    // Check trends with each status
    const statuses = ['submitted', 'validated', 'validating', 'approved'];
    
    for (const status of statuses) {
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('id, title, status')
        .eq('status', status)
        .limit(5);
      
      if (error) {
        console.log(`❌ Error checking ${status}:`, error.message);
      } else {
        console.log(`\n${status.toUpperCase()} status: ${data?.length || 0} trends`);
        if (data && data.length > 0) {
          data.forEach(t => {
            console.log(`  • ${t.title || 'Untitled'}`);
          });
        }
      }
    }
    
    // Check our specific dummy trends
    console.log('\n\n🎯 Our Dummy Trends Status:');
    console.log('-'.repeat(40));
    
    const dummyTitles = ['Stanley Cup Obsession', 'Roman Empire Thoughts', 'Throwing a Fit', 'Girl Dinner', 'Mob Wife Aesthetic'];
    
    const { data: dummyTrends, error: dummyError } = await supabase
      .from('trend_submissions')
      .select('id, title, status, platform, category, description')
      .in('title', dummyTitles);
    
    if (dummyTrends && dummyTrends.length > 0) {
      dummyTrends.forEach(trend => {
        console.log(`\n"${trend.title}"`);
        console.log(`  ID: ${trend.id}`);
        console.log(`  Status: ${trend.status} ${trend.status === 'validating' ? '✅' : '❌'}`);
        console.log(`  Platform: ${trend.platform}`);
        console.log(`  Category: ${trend.category}`);
        console.log(`  Description: ${trend.description?.substring(0, 50)}...`);
      });
    } else {
      console.log('❌ Dummy trends not found!');
    }
    
    // Check what the actual query would return
    console.log('\n\n📋 What the predictions page query returns:');
    console.log('-'.repeat(40));
    
    const { data: pageData, error: pageError } = await supabase
      .from('trend_submissions')
      .select('*')
      .in('status', ['submitted', 'validated', 'validating', 'approved'])
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (pageError) {
      console.log('❌ Error:', pageError.message);
    } else if (pageData && pageData.length > 0) {
      console.log(`\nFound ${pageData.length} trends that should display:\n`);
      pageData.slice(0, 10).forEach((trend, i) => {
        console.log(`${i + 1}. "${trend.title || 'Untitled'}" (${trend.status})`);
      });
    } else {
      console.log('❌ No trends found with the required statuses!');
    }
    
    // Check if there's an auth issue
    console.log('\n\n🔐 Checking for Auth/RLS issues:');
    console.log('-'.repeat(40));
    
    // Try with anon key to simulate what the frontend sees
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseAnon = createClient(supabaseUrl, anonKey);
    
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('trend_submissions')
      .select('id, title')
      .limit(5);
    
    if (anonError) {
      console.log('❌ RLS Error with anon key:', anonError.message);
      console.log('   This might be why trends aren\'t showing!');
    } else {
      console.log(`✅ Anon key can read ${anonData?.length || 0} trends`);
    }
    
    console.log('\n\n💡 SOLUTIONS:');
    console.log('=' .repeat(60));
    
    if (pageData && pageData.length > 0) {
      console.log('✅ Data exists in database');
      console.log('\nPossible frontend issues:');
      console.log('1. Check browser console for errors');
      console.log('2. Check if user is logged in');
      console.log('3. Check Network tab for failed API calls');
      console.log('4. Try hard refresh (Cmd+Shift+R)');
    } else {
      console.log('❌ No data with correct status');
      console.log('\nTo fix:');
      console.log('1. Run: node manually-validate-trends.js');
      console.log('2. Or update some trends to "validating" status');
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
  
  process.exit(0);
}

debugPredictionsPage();