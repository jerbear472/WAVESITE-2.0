const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Supabase URL and Key from environment or update these values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('Please set your Supabase URL and Service Role Key');
  console.error('You can find these in your Supabase project settings');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyChanges() {
  try {
    console.log('🔄 Applying scroll session earnings removal...\n');

    // Read the SQL file
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'REMOVE_SCROLL_SESSION_EARNINGS.sql'),
      'utf8'
    );

    // Split by semicolons and filter out empty statements and comments
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== 'PRINT');

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (!statement) continue;
      
      try {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error) {
          // Try direct execution as alternative
          const { data, error: directError } = await supabase
            .from('_sql')
            .select()
            .sql(statement + ';');
            
          if (directError) {
            console.error(`❌ Error: ${directError.message}`);
            errorCount++;
          } else {
            console.log(`✅ Success`);
            successCount++;
          }
        } else {
          console.log(`✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. This might be normal if:');
      console.log('- Triggers/functions were already dropped');
      console.log('- Columns were already removed');
      console.log('\nPlease run the SQL directly in Supabase SQL Editor for full control.');
    } else {
      console.log('\n🎉 All changes applied successfully!');
      console.log('Scroll sessions no longer generate earnings.');
      console.log('They now only provide streak multipliers for trend submissions.');
    }

  } catch (error) {
    console.error('Failed to apply changes:', error);
    console.log('\n💡 Tip: Run the SQL file directly in your Supabase SQL Editor:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy contents of REMOVE_SCROLL_SESSION_EARNINGS.sql');
    console.log('4. Paste and run');
  }
}

// Note: This approach might not work for all SQL statements
console.log('⚠️  Note: This script method may have limitations.');
console.log('For best results, run the SQL directly in Supabase SQL Editor.\n');

applyChanges();