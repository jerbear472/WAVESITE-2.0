// Script to fix validation data issues
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixValidationData() {
  console.log('🔧 Fixing validation data...\n');

  try {
    // 1. Update trends without status
    console.log('1️⃣ Updating trends without status...');
    const { data: trendsWithoutStatus, error: statusCheckError } = await supabase
      .from('captured_trends')
      .select('id')
      .is('status', null);
    
    if (statusCheckError) {
      console.error('Error checking trends:', statusCheckError.message);
    } else if (trendsWithoutStatus && trendsWithoutStatus.length > 0) {
      const { error: updateError } = await supabase
        .from('captured_trends')
        .update({ 
          status: 'pending_validation',
          validation_count: 0,
          positive_votes: 0,
          skip_count: 0 
        })
        .is('status', null);
      
      if (updateError) {
        console.error('❌ Error updating trends:', updateError.message);
      } else {
        console.log(`✅ Updated ${trendsWithoutStatus.length} trends to pending_validation status`);
      }
    } else {
      console.log('✅ All trends already have a status');
    }

    // 2. Ensure validation columns exist and have defaults
    console.log('\n2️⃣ Updating trends with null validation counts...');
    const { error: validationUpdateError } = await supabase
      .from('captured_trends')
      .update({
        validation_count: 0,
        positive_votes: 0,
        skip_count: 0
      })
      .or('validation_count.is.null,positive_votes.is.null,skip_count.is.null');
    
    if (validationUpdateError) {
      console.error('❌ Error updating validation counts:', validationUpdateError.message);
    } else {
      console.log('✅ Updated validation counts to have default values');
    }

    // 3. Check final state
    console.log('\n3️⃣ Final state check...');
    const { data: finalTrends, count } = await supabase
      .from('captured_trends')
      .select('*', { count: 'exact' })
      .eq('status', 'pending_validation')
      .lt('validation_count', 10);
    
    console.log(`✅ ${count || 0} trends are ready for validation`);
    
    if (finalTrends && finalTrends.length > 0) {
      console.log('\nSample trends ready for validation:');
      finalTrends.slice(0, 3).forEach((trend, i) => {
        console.log(`${i + 1}. [${trend.platform}] ${trend.title}`);
        console.log(`   Votes: ${trend.validation_count}, Positive: ${trend.positive_votes}`);
      });
    }

    // 4. Create sample trends if none exist
    if (!finalTrends || finalTrends.length === 0) {
      console.log('\n4️⃣ No trends found. Would you like to create sample trends?');
      console.log('Run: npm run setup:validation');
    }

  } catch (error) {
    console.error('❌ Fix error:', error);
  }
}

// Run the fix
fixValidationData();