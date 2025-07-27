const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyVoteCountingFix() {
  console.log('🗳️  Fixing vote counting system...\n');

  try {
    // Update the verify page
    console.log('📄 Updating verify page to properly save votes...');
    
    const verifyPagePath = path.join(__dirname, 'web', 'app', '(authenticated)', 'verify', 'page.tsx');
    const fixedPagePath = path.join(__dirname, 'web', 'app', '(authenticated)', 'verify', 'page.fixed.tsx');
    
    if (fs.existsSync(fixedPagePath)) {
      // Backup original
      const backupPath = verifyPagePath + '.backup-votecounting-' + new Date().toISOString().replace(/:/g, '-');
      if (fs.existsSync(verifyPagePath)) {
        fs.copyFileSync(verifyPagePath, backupPath);
        console.log(`   📦 Original backed up to: ${path.basename(backupPath)}`);
      }
      
      // Copy fixed version
      fs.copyFileSync(fixedPagePath, verifyPagePath);
      console.log('   ✅ Fixed verify page activated\n');
    }

    console.log('📊 Key improvements in the fixed version:');
    console.log('   ✅ Proper vote counting (positive/negative)');
    console.log('   ✅ Real-time percentage display');
    console.log('   ✅ Visual vote progress bar');
    console.log('   ✅ Vote animation feedback');
    console.log('   ✅ Duplicate vote prevention');
    console.log('   ✅ Automatic count updates via triggers\n');

    console.log('🔧 Database updates needed:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy contents of supabase/fix_vote_counting.sql');
    console.log('   4. Execute the SQL\n');

    console.log('📈 New features available after update:');
    console.log('   - Live vote percentages on each trend');
    console.log('   - Visual progress bars showing yes/no ratio');
    console.log('   - Detailed vote statistics view');
    console.log('   - Vote breakdown analytics\n');

    console.log('✨ Vote counting fix ready to deploy!\n');

    // Test the current state
    console.log('🔍 Checking current database state...');
    
    const { data: sampleTrend, error: sampleError } = await supabase
      .from('trend_submissions')
      .select('id, description, validation_count, positive_validations, negative_validations')
      .limit(1)
      .single();

    if (!sampleError && sampleTrend) {
      console.log('📊 Sample trend vote data:');
      console.log(`   Description: ${sampleTrend.description?.substring(0, 50)}...`);
      console.log(`   Total votes: ${sampleTrend.validation_count || 0}`);
      console.log(`   Positive votes: ${sampleTrend.positive_validations || 'Not tracked yet'}`);
      console.log(`   Negative votes: ${sampleTrend.negative_validations || 'Not tracked yet'}\n`);
      
      if (sampleTrend.positive_validations === null) {
        console.log('⚠️  Vote counting columns not yet added. Run the SQL migration first.');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the fix
applyVoteCountingFix().catch(console.error);