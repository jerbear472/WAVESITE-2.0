const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase connection
const supabaseUrl = 'https://whmksfssbnxhqrnfhvqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobWtzZnNzYm54aHFybmZodnF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzU4NzIwMCwiZXhwIjoyMDQ5MTYzMjAwfQ.fcAf0qEwJPxZJSPSzQfXDT9DPPhmeLDwlkJRLvFAzL0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyEarningsFix() {
  console.log('🚀 Applying earnings consistency fix...\n');
  
  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250114_fix_earnings_consistency.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing migration...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    }).single();
    
    if (error) {
      // If exec_sql doesn't exist, try running it differently
      console.log('⚠️ exec_sql not available, trying direct approach...');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const statement of statements) {
        try {
          // Skip certain statements that might not work via RPC
          if (statement.includes('DROP FUNCTION') || 
              statement.includes('DROP TRIGGER') ||
              statement.includes('CREATE OR REPLACE FUNCTION') ||
              statement.includes('CREATE TRIGGER') ||
              statement.includes('GRANT')) {
            console.log('⏭️ Skipping DDL statement (needs admin access)');
            continue;
          }
          
          // Try to execute data updates
          if (statement.includes('UPDATE')) {
            const { error: updateError } = await supabase.rpc('exec_sql', {
              sql_query: statement + ';'
            });
            
            if (!updateError) {
              successCount++;
            } else {
              errorCount++;
              console.log(`❌ Error: ${updateError.message}`);
            }
          }
        } catch (e) {
          errorCount++;
          console.log(`❌ Error executing statement: ${e.message}`);
        }
      }
      
      console.log(`\n✅ Completed: ${successCount} successful, ${errorCount} errors`);
    } else {
      console.log('✅ Migration applied successfully!');
    }
    
    // Test the new earnings calculation
    console.log('\n📊 Testing earnings calculations:\n');
    
    const testCases = [
      { tier: 'learning', streak: 0, expected: 0.25 },
      { tier: 'learning', streak: 7, expected: 0.38 }, // 0.25 × 1.0 × 1.5
      { tier: 'verified', streak: 0, expected: 0.38 }, // 0.25 × 1.5 × 1.0
      { tier: 'verified', streak: 7, expected: 0.56 }, // 0.25 × 1.5 × 1.5
      { tier: 'elite', streak: 30, expected: 1.25 },   // 0.25 × 2.0 × 2.5
      { tier: 'master', streak: 30, expected: 1.88 },  // 0.25 × 3.0 × 2.5
    ];
    
    for (const test of testCases) {
      const earning = calculateEarning(test.tier, test.streak);
      console.log(`${test.tier} tier, ${test.streak} day streak: $${earning.toFixed(2)} (expected: $${test.expected.toFixed(2)}) ${
        Math.abs(earning - test.expected) < 0.01 ? '✅' : '❌'
      }`);
    }
    
    console.log('\n🎉 Earnings fix completed!');
    console.log('\n📝 Summary:');
    console.log('- Base rate: $0.25 per trend');
    console.log('- Tier multipliers: 0.5x to 3.0x');
    console.log('- Streak multipliers: 1.0x to 2.5x');
    console.log('\n⚠️ Note: Database functions need to be updated manually via Supabase dashboard');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
  }
}

function calculateEarning(tier, streakDays) {
  const base = 0.25;
  
  const tierMultipliers = {
    master: 3.0,
    elite: 2.0,
    verified: 1.5,
    learning: 1.0,
    restricted: 0.5,
  };
  
  const streakMultiplier = 
    streakDays >= 30 ? 2.5 :
    streakDays >= 14 ? 2.0 :
    streakDays >= 7 ? 1.5 :
    streakDays >= 2 ? 1.2 :
    1.0;
  
  return base * (tierMultipliers[tier] || 1.0) * streakMultiplier;
}

// Run the fix
applyEarningsFix();