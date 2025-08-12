#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRecentThumbnails() {
  console.log('🔍 Checking recent trend submissions and their thumbnails...\n');

  try {
    // Get recent submissions
    const { data: trends, error } = await supabase
      .from('trend_submissions')
      .select('id, description, thumbnail_url, post_url, wave_score, created_at, evidence')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching trends:', error);
      return;
    }

    if (!trends || trends.length === 0) {
      console.log('No trend submissions found.');
      return;
    }

    console.log(`Found ${trends.length} recent submissions:\n`);
    console.log('='.repeat(80));

    trends.forEach((trend, index) => {
      console.log(`\n${index + 1}. ${trend.description.substring(0, 50)}...`);
      console.log(`   Created: ${new Date(trend.created_at).toLocaleString()}`);
      console.log(`   ID: ${trend.id}`);
      console.log(`   Post URL: ${trend.post_url || 'None'}`);
      console.log(`   Thumbnail: ${trend.thumbnail_url ? '✅ ' + trend.thumbnail_url.substring(0, 50) + '...' : '❌ Missing'}`);
      console.log(`   Wave Score: ${trend.wave_score || 'Not set'}`);
      
      // Check evidence JSON for URL
      if (trend.evidence && typeof trend.evidence === 'object') {
        const evidenceUrl = trend.evidence.url;
        if (evidenceUrl) {
          console.log(`   Evidence URL: ${evidenceUrl}`);
        }
      }
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    
    const withThumbnails = trends.filter(t => t.thumbnail_url).length;
    const withWaveScores = trends.filter(t => t.wave_score !== null).length;
    const withPostUrls = trends.filter(t => t.post_url).length;
    
    console.log(`✅ Trends with thumbnails: ${withThumbnails}/${trends.length}`);
    console.log(`📊 Trends with wave scores: ${withWaveScores}/${trends.length}`);
    console.log(`🔗 Trends with post URLs: ${withPostUrls}/${trends.length}`);
    
    if (withThumbnails === 0) {
      console.log('\n⚠️  No recent trends have thumbnails!');
      console.log('This suggests the thumbnail extraction might not be working properly.');
      console.log('\nPossible fixes:');
      console.log('1. Check if the API endpoint /api/tiktok-thumbnail is accessible');
      console.log('2. Verify the EnhancedVercelSafeThumbnailExtractor is being called');
      console.log('3. Check browser console for errors when submitting trends');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRecentThumbnails().catch(console.error);