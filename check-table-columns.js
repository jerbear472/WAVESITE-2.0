const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTableColumns() {
  console.log('📊 Checking trend_submissions table structure...\n');
  
  try {
    // Get a sample row to see actual columns
    const { data: sample, error } = await supabase
      .from('trend_submissions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (sample && sample.length > 0) {
      const columns = Object.keys(sample[0]);
      console.log('✅ Table columns found:');
      console.log('================================');
      columns.forEach(col => {
        const value = sample[0][col];
        const type = value === null ? 'null' : typeof value;
        console.log(`  - ${col} (${type})`);
      });
      
      // Check for critical columns
      console.log('\n🔍 Critical column check:');
      console.log('================================');
      const criticalColumns = ['spotter_id', 'user_id', 'payment_amount', 'category', 'description'];
      
      criticalColumns.forEach(col => {
        if (columns.includes(col)) {
          console.log(`  ✅ ${col} exists`);
        } else {
          console.log(`  ❌ ${col} MISSING`);
        }
      });
      
      // Check which user column exists
      if (columns.includes('spotter_id')) {
        console.log('\n📝 Note: Table uses "spotter_id" for user reference');
      } else if (columns.includes('user_id')) {
        console.log('\n📝 Note: Table uses "user_id" for user reference');
      } else {
        console.log('\n⚠️ Warning: No user reference column found!');
      }
      
    } else {
      console.log('No data in table, inserting test row to check structure...');
      
      // Try different column names
      const attempts = [
        { name: 'spotter_id', data: { spotter_id: '00000000-0000-0000-0000-000000000000', category: 'test', description: 'test' } },
        { name: 'user_id', data: { user_id: '00000000-0000-0000-0000-000000000000', category: 'test', description: 'test' } }
      ];
      
      for (const attempt of attempts) {
        const { error: testError } = await supabase
          .from('trend_submissions')
          .insert(attempt.data);
        
        if (!testError) {
          console.log(`✅ Table accepts "${attempt.name}" column`);
          // Clean up
          await supabase
            .from('trend_submissions')
            .delete()
            .eq(attempt.name, '00000000-0000-0000-0000-000000000000');
          break;
        } else {
          console.log(`❌ "${attempt.name}" failed:`, testError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkTableColumns();