const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.log('\n📝 Manual deployment instructions:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy the contents of supabase/enterprise_schema.sql');
  console.log('4. Paste and run in the SQL editor');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log('🔄 Testing Supabase connection...');
  
  try {
    // Test by checking if profiles table exists
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful!\n');
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

async function checkExistingTables() {
  console.log('🔍 Checking for existing enterprise tables...\n');
  
  const tables = [
    'enterprise_trends',
    'api_keys', 
    'enterprise_alerts',
    'alert_notifications',
    'export_jobs',
    'integrations',
    'analytics_cache'
  ];
  
  const existing = [];
  const missing = [];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        existing.push(table);
      } else {
        missing.push(table);
      }
    } catch {
      missing.push(table);
    }
  }
  
  if (existing.length > 0) {
    console.log('✅ Existing tables found:');
    existing.forEach(t => console.log(`   - ${t}`));
  }
  
  if (missing.length > 0) {
    console.log('\n❌ Missing tables:');
    missing.forEach(t => console.log(`   - ${t}`));
  }
  
  return { existing, missing };
}

async function createSampleData() {
  console.log('\n📊 Creating sample enterprise data...\n');
  
  try {
    // Sample enterprise trends
    const trends = [
      {
        title: 'AI-Powered Productivity Tools',
        description: 'New wave of AI assistants transforming workplace efficiency',
        category: 'technology',
        velocity: 92.5,
        sentiment: 0.8,
        geographic_origin: 'San Francisco',
        current_phase: 'growing',
        validation_score: 87,
        engagement_count: 125000,
        sources: [
          { platform: 'Twitter', url: '#', engagement: 50000 },
          { platform: 'LinkedIn', url: '#', engagement: 75000 }
        ]
      },
      {
        title: 'Sustainable Fashion Movement',
        description: 'Gen Z driving eco-conscious fashion choices',
        category: 'fashion',
        velocity: 78.3,
        sentiment: 0.6,
        geographic_origin: 'London',
        current_phase: 'viral',
        validation_score: 92,
        engagement_count: 450000,
        sources: [
          { platform: 'TikTok', url: '#', engagement: 300000 },
          { platform: 'Instagram', url: '#', engagement: 150000 }
        ]
      },
      {
        title: 'Web3 Gaming Revolution',
        description: 'Blockchain-based games seeing massive adoption',
        category: 'technology',
        velocity: 85.7,
        sentiment: 0.3,
        geographic_origin: 'Seoul',
        current_phase: 'emerging',
        validation_score: 75,
        engagement_count: 89000,
        sources: [
          { platform: 'Discord', url: '#', engagement: 45000 },
          { platform: 'Reddit', url: '#', engagement: 44000 }
        ]
      }
    ];
    
    console.log('🔄 Inserting sample trends...');
    const { data: trendsData, error: trendsError } = await supabase
      .from('enterprise_trends')
      .insert(trends)
      .select();
    
    if (trendsError) {
      console.log('⚠️  Could not insert trends:', trendsError.message);
    } else {
      console.log(`✅ Created ${trendsData.length} sample trends`);
    }
    
  } catch (error) {
    console.log('⚠️  Sample data creation skipped:', error.message);
  }
}

async function main() {
  console.log('🌊 WaveSight Enterprise Schema Deployment Helper\n');
  console.log('=' .repeat(50) + '\n');
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.log('\n❌ Cannot connect to Supabase');
    console.log('\n📝 Please deploy manually:');
    console.log('1. Go to: https://app.supabase.com/project/achuavagkhjenaypawij/sql');
    console.log('2. Copy contents from: supabase/enterprise_schema.sql');
    console.log('3. Paste and click "Run"\n');
    return;
  }
  
  // Check existing tables
  const { existing, missing } = await checkExistingTables();
  
  if (missing.length === 0) {
    console.log('\n✨ All enterprise tables already exist!');
    
    // Optionally create sample data
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\nCreate sample data? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        await createSampleData();
      }
      readline.close();
      console.log('\n✅ Setup complete!');
    });
  } else {
    console.log('\n📝 To complete deployment:');
    console.log('1. Go to your Supabase SQL Editor:');
    console.log('   https://app.supabase.com/project/achuavagkhjenaypawij/sql\n');
    console.log('2. Copy the entire contents of:');
    console.log('   supabase/enterprise_schema.sql\n');
    console.log('3. Paste into the SQL editor and click "Run"\n');
    console.log('4. After deployment, run this script again to verify\n');
  }
}

main().catch(console.error);