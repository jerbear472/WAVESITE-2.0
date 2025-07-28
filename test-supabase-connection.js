// Test Supabase connection and submission
import { createClient } from '@supabase/supabase-js';

// Test direct Supabase connection
async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  // You'll need to replace these with your actual values
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test 1: Basic connection
    console.log('\n1. Testing basic connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('trend_submissions')
      .select('id')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ Connection error:', tablesError);
      return;
    }
    
    console.log('✅ Basic connection successful');
    
    // Test 2: Check if we can read
    console.log('\n2. Testing read permissions...');
    const { count, error: countError } = await supabase
      .from('trend_submissions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Read error:', countError);
    } else {
      console.log(`✅ Can read table (${count} rows)`);
    }
    
    // Test 3: Check table structure
    console.log('\n3. Checking table columns...');
    const { data: sample, error: sampleError } = await supabase
      .from('trend_submissions')
      .select('*')
      .limit(1);
    
    if (sample && sample.length > 0) {
      console.log('✅ Table columns:', Object.keys(sample[0]));
    }
    
    // Test 4: Test minimal insert (without actually inserting)
    console.log('\n4. Testing insert structure...');
    const testData = {
      spotter_id: 'test-user-id',
      category: 'behavior_pattern',
      description: 'Test submission',
      evidence: { url: 'https://example.com', title: 'Test' },
      virality_prediction: 5,
      status: 'pending',
      quality_score: 0.5,
      validation_count: 0
    };
    
    console.log('Would insert:', testData);
    
    // Test 5: Check for any ongoing issues
    console.log('\n5. Testing response time...');
    const start = Date.now();
    await supabase.from('trend_submissions').select('id').limit(1);
    const responseTime = Date.now() - start;
    console.log(`Response time: ${responseTime}ms`);
    
    if (responseTime > 5000) {
      console.warn('⚠️  Slow response time detected');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run in browser console
console.log('Copy this function to browser console and run: testSupabaseConnection()');