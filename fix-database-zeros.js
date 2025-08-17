const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixZerosInDatabase() {
  console.log('🔍 Checking for "0" and "00" values in database...\n');

  try {
    // First, check what we're dealing with
    const { data: problematicTrends, error: checkError } = await supabase
      .from('trend_submissions')
      .select('id, title, description, created_at')
      .or('title.in.("0","00"),description.in.("0","00")')
      .limit(10);

    if (checkError) {
      console.error('Error checking for problematic trends:', checkError);
      return;
    }

    console.log(`Found ${problematicTrends?.length || 0} trends with "0" or "00" values:`);
    if (problematicTrends && problematicTrends.length > 0) {
      problematicTrends.forEach(trend => {
        console.log(`  - ID: ${trend.id}, Title: "${trend.title}", Description: "${trend.description?.substring(0, 50)}..."`);
      });
    }
    console.log('');

    // Fix titles that are literally "0" or "00"
    console.log('📝 Fixing titles...');
    const { data: titleFix, error: titleError } = await supabase
      .from('trend_submissions')
      .update({ title: 'Untitled Trend' })
      .in('title', ['0', '00', '']);

    if (titleError) {
      console.error('Error fixing titles:', titleError);
    } else {
      console.log('  ✅ Titles fixed');
    }

    // Fix descriptions that are literally "0" or "00"
    console.log('📝 Fixing descriptions...');
    const { data: descFix, error: descError } = await supabase
      .from('trend_submissions')
      .update({ description: null })
      .in('description', ['0', '00', '']);

    if (descError) {
      console.error('Error fixing descriptions:', descError);
    } else {
      console.log('  ✅ Descriptions fixed');
    }

    // Fix trend_headline if it exists
    console.log('📝 Fixing trend_headline...');
    const { data: headlineFix, error: headlineError } = await supabase
      .from('trend_submissions')
      .update({ trend_headline: null })
      .in('trend_headline', ['0', '00', '']);

    if (headlineError) {
      // Column might not exist, that's okay
      console.log('  ⚠️  trend_headline column might not exist (that\'s okay)');
    } else {
      console.log('  ✅ trend_headline fixed');
    }

    // Fix why_trending if it exists
    console.log('📝 Fixing why_trending...');
    const { data: whyFix, error: whyError } = await supabase
      .from('trend_submissions')
      .update({ why_trending: null })
      .in('why_trending', ['0', '00', '']);

    if (whyError) {
      // Column might not exist, that's okay
      console.log('  ⚠️  why_trending column might not exist (that\'s okay)');
    } else {
      console.log('  ✅ why_trending fixed');
    }

    // Also fix NULL titles
    console.log('📝 Fixing NULL titles...');
    const { data: nullTitleFix, error: nullTitleError } = await supabase
      .from('trend_submissions')
      .update({ title: 'Untitled Trend' })
      .is('title', null);

    if (nullTitleError) {
      console.error('Error fixing NULL titles:', nullTitleError);
    } else {
      console.log('  ✅ NULL titles fixed');
    }

    // Check the results
    console.log('\n🔍 Verifying cleanup...');
    const { data: cleanCheck, error: cleanCheckError } = await supabase
      .from('trend_submissions')
      .select('id, title, description')
      .or('title.in.("0","00"),description.in.("0","00")')
      .limit(5);

    if (cleanCheckError) {
      console.error('Error checking cleanup:', cleanCheckError);
    } else {
      if (cleanCheck && cleanCheck.length > 0) {
        console.log(`  ⚠️  Still found ${cleanCheck.length} trends with "0" values`);
      } else {
        console.log('  ✅ No more "0" or "00" values found!');
      }
    }

    // Show sample of cleaned data
    console.log('\n📊 Sample of cleaned trends:');
    const { data: sampleTrends, error: sampleError } = await supabase
      .from('trend_submissions')
      .select('id, title, description, category')
      .order('created_at', { ascending: false })
      .limit(5);

    if (sampleError) {
      console.error('Error fetching sample:', sampleError);
    } else if (sampleTrends) {
      sampleTrends.forEach(trend => {
        console.log(`  - "${trend.title || 'Untitled'}" [${trend.category}]`);
      });
    }

    console.log('\n✅ Database cleanup complete! Refresh your dashboard to see the changes.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixZerosInDatabase();