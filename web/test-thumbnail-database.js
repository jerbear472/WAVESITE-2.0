// Test script to verify thumbnails in database
// Run with: node test-thumbnail-database.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkThumbnails() {
  console.log('CHECKING THUMBNAILS IN DATABASE');
  console.log('================================\n');

  try {
    // Get recent submissions
    const { data: submissions, error } = await supabase
      .from('trend_submissions')
      .select('id, created_at, thumbnail_url, screenshot_url, post_url, evidence, wave_score')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching submissions:', error);
      return;
    }

    console.log(`Found ${submissions?.length || 0} recent submissions\n`);

    if (submissions && submissions.length > 0) {
      submissions.forEach((submission, index) => {
        console.log(`${index + 1}. Submission ID: ${submission.id}`);
        console.log(`   Created: ${new Date(submission.created_at).toLocaleString()}`);
        console.log(`   Thumbnail URL: ${submission.thumbnail_url || 'NOT SET'}`);
        console.log(`   Screenshot URL: ${submission.screenshot_url || 'NOT SET'}`);
        console.log(`   Post URL: ${submission.post_url || 'NOT SET'}`);
        console.log(`   Wave Score: ${submission.wave_score || 'NOT SET'}`);
        
        if (submission.evidence?.url) {
          console.log(`   Evidence URL: ${submission.evidence.url}`);
        }
        
        // Check if has any image
        const hasImage = submission.thumbnail_url || submission.screenshot_url;
        console.log(`   Has Image: ${hasImage ? '✅ YES' : '❌ NO'}`);
        console.log('---\n');
      });

      // Summary
      const withThumbnail = submissions.filter(s => s.thumbnail_url).length;
      const withScreenshot = submissions.filter(s => s.screenshot_url).length;
      const withAnyImage = submissions.filter(s => s.thumbnail_url || s.screenshot_url).length;
      const withWaveScore = submissions.filter(s => s.wave_score).length;

      console.log('SUMMARY');
      console.log('=======');
      console.log(`Submissions with thumbnail_url: ${withThumbnail}/${submissions.length}`);
      console.log(`Submissions with screenshot_url: ${withScreenshot}/${submissions.length}`);
      console.log(`Submissions with any image: ${withAnyImage}/${submissions.length}`);
      console.log(`Submissions with wave_score: ${withWaveScore}/${submissions.length}`);

      if (withAnyImage < submissions.length) {
        console.log('\n⚠️  Some submissions are missing images!');
        console.log('This could be why thumbnails are not showing on the timeline.');
      }
    } else {
      console.log('No submissions found in database');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkThumbnails().catch(console.error);