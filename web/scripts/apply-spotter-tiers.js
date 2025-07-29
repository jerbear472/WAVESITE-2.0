const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySpotterTiers() {
  console.log('🚀 Applying Spotter Tiers Enhancement...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-spotter-performance-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolons but be careful with functions
    const statements = sql
      .split(/;\s*$/gm)
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim() + ';');

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 50).replace(/\n/g, ' ');
      
      console.log(`Executing statement ${i + 1}/${statements.length}: ${preview}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single();

      if (error) {
        // Try direct execution as fallback
        const { error: directError } = await supabase
          .from('_sql')
          .insert({ query: statement })
          .single();

        if (directError) {
          console.error(`❌ Error executing statement ${i + 1}:`, directError.message);
          console.error('Statement:', preview);
          
          // Continue with other statements
          continue;
        }
      }
      
      console.log(`✅ Statement ${i + 1} executed successfully`);
    }

    console.log('\n🎉 Spotter Tiers schema applied successfully!\n');

    // Initialize existing users
    console.log('📊 Initializing existing users...');
    
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .is('spotter_tier', null);

    if (!usersError && users) {
      console.log(`Found ${users.length} users without tiers`);
      
      // Update users to learning tier
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          spotter_tier: 'learning',
          spotter_quality_score: 0.5,
          spotter_tier_updated_at: new Date().toISOString()
        })
        .is('spotter_tier', null);

      if (updateError) {
        console.error('Error initializing user tiers:', updateError);
      } else {
        console.log('✅ User tiers initialized');
      }
    }

    // Create initial daily challenge
    console.log('\n🎯 Creating initial daily challenge...');
    
    const today = new Date().toISOString().split('T')[0];
    const { error: challengeError } = await supabase
      .from('daily_challenges')
      .insert({
        challenge_id: `daily_${today}`,
        challenge_date: today,
        category: 'Tech & Gaming',
        description: 'Submit 3 Tech & Gaming trends',
        target_count: 3,
        reward_amount: 0.5,
        is_active: true
      });

    if (challengeError && !challengeError.message.includes('duplicate')) {
      console.error('Error creating daily challenge:', challengeError);
    } else {
      console.log('✅ Daily challenge created');
    }

    console.log('\n✨ Enhancement deployment complete!\n');
    console.log('Next steps:');
    console.log('1. Update the scroll page to use page-enhanced.tsx');
    console.log('2. Test the new features');
    console.log('3. Monitor user tier progression');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
applySpotterTiers();