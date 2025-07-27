#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🔧 Setting up WaveSight database...\n');

  try {
    // Test connection
    console.log('Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('count');

    if (testError && testError.code === '42P01') {
      console.log('❌ Tables not found. Please run the following SQL in your Supabase dashboard:\n');
      
      // Read and display the schema file
      const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      console.log('Copy and paste this SQL into your Supabase SQL editor:');
      console.log('https://supabase.com/dashboard/project/achuavagkhjenaypawij/editor\n');
      console.log('='.repeat(80));
      console.log(schema);
      console.log('='.repeat(80));
      
      return false;
    } else if (testError) {
      console.error('❌ Connection error:', testError.message);
      console.log('\nPossible issues:');
      console.log('1. Your Supabase project might be paused (check https://supabase.com/dashboard)');
      console.log('2. Invalid credentials in .env.local');
      console.log('3. Network connectivity issues');
      return false;
    }

    console.log('✅ Connected to Supabase successfully!');
    console.log('✅ Database tables exist');

    // Check authentication settings
    console.log('\nChecking authentication settings...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('ℹ️  No active session (this is normal)');
    } else {
      console.log('✅ Found active session for:', user.email);
    }

    return true;
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 WaveSight Setup Script\n');

  // Check database
  const dbReady = await setupDatabase();

  if (!dbReady) {
    console.log('\n⚠️  Database setup required!');
    console.log('Please follow the instructions above to set up your database.\n');
  } else {
    console.log('\n✅ Database is ready!');
  }

  // Instructions for running the app
  console.log('\n📝 Next steps:\n');
  console.log('1. Make sure your database is set up (if not done already)');
  console.log('2. Start the web app:');
  console.log('   cd web && npm run dev\n');
  console.log('3. (Optional) Start the backend API:');
  console.log('   cd backend && python -m uvicorn main:app --reload\n');
  console.log('4. Visit http://localhost:3000\n');
  console.log('5. Register a new account or sign in\n');
}

main().catch(console.error);