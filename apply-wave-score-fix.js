const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyWaveScoreFix() {
  console.log('🌊 Applying Wave Score Display Fix...\n');

  console.log('📋 This fix will:');
  console.log('   - Add wave_score column to trend_submissions');
  console.log('   - Create a function to calculate wave scores');
  console.log('   - Include trend velocity (stage) in calculations');
  console.log('   - Include yes/no vote counts from verifications');
  console.log('   - Create triggers to auto-update wave scores');
  console.log('   - Create a helpful view for timeline data\n');

  console.log('⚠️  IMPORTANT: You need to run the SQL file in Supabase Dashboard');
  console.log('   File: fix-wave-score-display.sql\n');

  console.log('📍 Steps to apply:');
  console.log('   1. Go to your Supabase Dashboard');
  console.log('   2. Navigate to SQL Editor');
  console.log('   3. Copy the contents of fix-wave-score-display.sql');
  console.log('   4. Paste and execute\n');

  // Test current data structure
  console.log('🔍 Checking current trend data...');
  
  try {
    const { data: sampleTrends, error } = await supabase
      .from('trend_submissions')
      .select(`
        id,
        description,
        stage,
        status,
        virality_prediction,
        validation_count,
        positive_validations,
        negative_validations,
        wave_score
      `)
      .limit(5);

    if (error) {
      console.log('⚠️  Could not fetch trends:', error.message);
    } else if (sampleTrends && sampleTrends.length > 0) {
      console.log('\n📊 Sample trend data:');
      sampleTrends.forEach((trend, i) => {
        console.log(`\n   Trend ${i + 1}:`);
        console.log(`   - Description: ${trend.description?.substring(0, 50)}...`);
        console.log(`   - Stage: ${trend.stage || 'Not set'}`);
        console.log(`   - Status: ${trend.status}`);
        console.log(`   - Virality Prediction: ${trend.virality_prediction || 0}/10`);
        console.log(`   - Votes: ${trend.positive_validations || 0}👍 ${trend.negative_validations || 0}👎`);
        console.log(`   - Current Wave Score: ${trend.wave_score || 'Not calculated'}`);
      });

      // Check if columns exist
      const hasStage = sampleTrends[0].hasOwnProperty('stage');
      const hasPositiveVotes = sampleTrends[0].hasOwnProperty('positive_validations');
      const hasWaveScore = sampleTrends[0].hasOwnProperty('wave_score');

      console.log('\n📋 Column Status:');
      console.log(`   - stage column: ${hasStage ? '✅ Exists' : '❌ Missing'}`);
      console.log(`   - positive_validations: ${hasPositiveVotes ? '✅ Exists' : '❌ Missing'}`);
      console.log(`   - wave_score: ${hasWaveScore ? '✅ Exists' : '❌ Missing'}`);

      if (!hasStage || !hasPositiveVotes || !hasWaveScore) {
        console.log('\n⚠️  Some columns are missing. The SQL script will add them.');
      }
    }

    // Test fetching with the new fields
    console.log('\n🧪 Testing enhanced trend query...');
    const { data: enhancedTrend, error: enhancedError } = await supabase
      .from('trend_submissions')
      .select(`
        *,
        profiles!trend_submissions_spotter_id_fkey (
          username,
          email
        )
      `)
      .limit(1)
      .single();

    if (!enhancedError && enhancedTrend) {
      console.log('✅ Database connection successful!');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  }

  console.log('\n🎯 Wave Score Calculation Formula:');
  console.log('   - Base: Virality prediction (30%)');
  console.log('   - Vote score: Based on yes/no ratio (up to 60%)');
  console.log('   - Engagement bonus: From likes/shares (up to 40%)');
  console.log('   - Stage multiplier:');
  console.log('     • Just Starting: 0.5x');
  console.log('     • Gaining Traction: 0.7x');
  console.log('     • Trending: 1.0x');
  console.log('     • Going Viral: 1.3x');
  console.log('     • At Peak: 0.9x');
  console.log('     • Declining: 0.6x');
  
  console.log('\n✨ After applying the fix:');
  console.log('   - Wave scores will update automatically');
  console.log('   - Timeline will show accurate scores (1-10)');
  console.log('   - Velocity status will be displayed');
  console.log('   - Vote counts will be visible');
  
  console.log('\n📱 Frontend Updates Applied:');
  console.log('   - Timeline page updated to show wave_score');
  console.log('   - Added stage/velocity display badges');
  console.log('   - Shows yes/no vote counts');
  console.log('   - Color-coded stage indicators');

  console.log('\n🚀 Next Steps:');
  console.log('   1. Run the SQL file in Supabase Dashboard');
  console.log('   2. Restart your development server');
  console.log('   3. Visit the timeline page to see the updates');
}

applyWaveScoreFix();