#!/usr/bin/env tsx
/**
 * Comprehensive diagnostic script for persona persistence system
 * Checks database, API endpoints, and data flow
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create admin client for database checks
const adminClient = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Create regular client for user operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabaseSchema() {
  console.log('\n🔍 Checking Database Schema...\n');
  
  if (!adminClient) {
    console.log('⚠️  No service role key - skipping admin checks');
    return;
  }

  try {
    // Check if user_personas table exists
    const { data: tables, error } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_personas');

    if (error) {
      console.error('❌ Error checking tables:', error);
      return;
    }

    if (tables && tables.length > 0) {
      console.log('✅ user_personas table exists');
      
      // Check table structure
      const { data: columns, error: colError } = await adminClient
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'user_personas');

      if (!colError && columns) {
        console.log('\nTable columns:');
        columns.forEach(col => {
          console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
        });
      }
    } else {
      console.log('❌ user_personas table does NOT exist');
      console.log('   Run the migration: supabase/add_user_personas_schema.sql');
    }

    // Check RLS policies
    const { data: policies, error: polError } = await adminClient
      .from('pg_policies')
      .select('policyname, tablename, cmd')
      .eq('tablename', 'user_personas');

    if (!polError && policies) {
      console.log('\nRLS Policies:');
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`);
      });
    }
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

async function testUserPersonaOperations() {
  console.log('\n🧪 Testing User Persona Operations...\n');

  // Test with a real user account
  const testEmail = 'test@example.com';
  const testPassword = 'testpassword123';

  console.log(`Attempting to sign in as ${testEmail}...`);
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authError || !authData.user) {
    console.log(`⚠️  Cannot sign in as test user: ${authError?.message}`);
    console.log('   You can create a test user or use your own credentials');
    return;
  }

  console.log(`✅ Signed in as user: ${authData.user.id}`);

  // Test direct database access
  console.log('\n📊 Testing direct database access...');
  
  const { data: existingPersona, error: fetchError } = await supabase
    .from('user_personas')
    .select('*')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (fetchError) {
    console.error('❌ Error fetching persona:', fetchError);
  } else if (existingPersona) {
    console.log('✅ Found existing persona:', existingPersona.id);
    console.log('   Created:', existingPersona.created_at);
    console.log('   Complete:', existingPersona.is_complete);
  } else {
    console.log('ℹ️  No existing persona found for this user');
  }

  // Test inserting/updating persona
  console.log('\n💾 Testing persona save...');

  const testPersonaData = {
    user_id: authData.user.id,
    location_country: 'Test Country',
    location_city: 'Test City',
    location_urban_type: 'urban',
    age_range: '25-34',
    education_level: 'Bachelor\'s',
    employment_status: 'full-time',
    industry: 'Technology',
    interests: ['Technology', 'Gaming'],
    is_complete: true,
    completion_date: new Date().toISOString()
  };

  const { data: savedPersona, error: saveError } = await supabase
    .from('user_personas')
    .upsert(testPersonaData, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (saveError) {
    console.error('❌ Error saving persona:', saveError);
  } else {
    console.log('✅ Persona saved successfully:', savedPersona.id);
  }

  // Test API endpoint
  console.log('\n🌐 Testing API endpoint...');
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
  
  try {
    const response = await fetch(`${apiUrl}/api/v1/persona`, {
      headers: {
        'Authorization': `Bearer ${authData.session?.access_token}`,
      },
    });

    console.log(`API Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API returned persona data');
    } else {
      const error = await response.text();
      console.log('❌ API error:', error);
    }
  } catch (error) {
    console.log('❌ Cannot reach API:', error);
  }

  // Clean up
  await supabase.auth.signOut();
}

async function checkProductionEndpoints() {
  console.log('\n🌍 Checking Production Endpoints...\n');

  // Check if Next.js API route exists
  try {
    const response = await fetch('https://your-vercel-app.vercel.app/api/v1/persona', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer dummy_token',
      },
    });
    
    if (response.status === 401) {
      console.log('✅ Next.js API route exists (returned 401 as expected)');
    } else {
      console.log(`⚠️  Unexpected status from API route: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Cannot reach production API route');
  }
}

async function suggestFixes() {
  console.log('\n💡 Suggested Fixes:\n');
  
  console.log('1. Ensure database migration is applied:');
  console.log('   npx supabase db push');
  console.log('   or manually run: supabase/add_user_personas_schema.sql');
  
  console.log('\n2. Verify environment variables in production:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY'); 
  console.log('   - NEXT_PUBLIC_API_URL');
  
  console.log('\n3. Check backend deployment:');
  console.log('   - Ensure personas router is registered');
  console.log('   - Check backend logs for errors');
  
  console.log('\n4. Test with debug mode:');
  console.log('   Open browser console and check for errors');
  console.log('   Look for "Persona saved successfully" messages');
}

// Run all checks
async function runDiagnostics() {
  console.log('🏥 Persona System Diagnostics');
  console.log('============================');
  
  await checkDatabaseSchema();
  await testUserPersonaOperations();
  await checkProductionEndpoints();
  await suggestFixes();
  
  console.log('\n✨ Diagnostics complete!');
}

runDiagnostics().catch(console.error);