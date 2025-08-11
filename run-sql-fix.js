#!/usr/bin/env node

// Run SQL fix for RLS policies
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase service credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies...\n');
  
  try {
    // Step 1: Drop and recreate the insert policy
    console.log('📝 Step 1: Updating insert policy...');
    
    // First check if we can query trend_submissions
    const { data: trends, error: trendsError } = await supabase
      .from('trend_submissions')
      .select('id')
      .limit(1);
    
    if (trendsError) {
      console.log('⚠️  Table access issue:', trendsError.message);
    } else {
      console.log('✅ Table access confirmed');
    }
    
    // Step 2: Check user profiles
    console.log('\n👥 Step 2: Checking user profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, username, email, spotter_tier')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (profilesError) {
      console.log('❌ Could not fetch profiles:', profilesError.message);
    } else {
      console.log(`✅ Found ${profiles.length} profiles:`);
      profiles.forEach(p => {
        console.log(`  - ${p.username} (${p.email}) - Tier: ${p.spotter_tier}`);
      });
    }
    
    // Step 3: Test inserting a trend with service role
    console.log('\n🧪 Step 3: Testing trend submission with service role...');
    
    // Get a user ID to test with
    if (profiles && profiles.length > 0) {
      const testUserId = profiles[0].id;
      
      const { data: testTrend, error: testError } = await supabase
        .from('trend_submissions')
        .insert({
          spotter_id: testUserId,
          category: 'meme_format',
          description: 'Service role test trend',
          platform: 'TikTok',
          creator_handle: '@servicetest',
          views_count: 1000,
          posted_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (testError) {
        console.log('❌ Service role insert failed:', testError.message);
        console.log('  This suggests a database-level issue');
      } else {
        console.log('✅ Service role insert successful!');
        console.log(`  Trend ID: ${testTrend.id}`);
        
        // Clean up test trend
        await supabase
          .from('trend_submissions')
          .delete()
          .eq('id', testTrend.id);
        console.log('  Test trend deleted');
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('The RLS policies need to be updated in Supabase SQL Editor.');
    console.log('\nTo fix this issue:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the following SQL:\n');
    
    const fixSQL = `
-- Fix RLS policy for trend submissions
DROP POLICY IF EXISTS "Authenticated users can submit trends" ON public.trend_submissions;

CREATE POLICY "Authenticated users can submit trends" ON public.trend_submissions
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to auto-set spotter_id
CREATE OR REPLACE FUNCTION public.set_trend_spotter_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.spotter_id IS NULL THEN
        NEW.spotter_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS set_trend_spotter ON public.trend_submissions;
CREATE TRIGGER set_trend_spotter
    BEFORE INSERT ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_trend_spotter_id();`;
    
    console.log(fixSQL);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixRLSPolicies();