// Test the complete submission flow with thumbnail
// Run with: node test-submission-flow.js

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

async function testSubmissionFlow() {
  console.log('TESTING COMPLETE SUBMISSION FLOW');
  console.log('=================================\n');

  try {
    // First, authenticate
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('❌ No active session. Please log in through the web app first.');
      return;
    }

    console.log('✅ Authenticated as:', session.user.email);
    console.log('User ID:', session.user.id);
    console.log('\n');

    // Create a test submission with thumbnail
    const testSubmission = {
      spotter_id: session.user.id,
      category: 'meme_format',
      description: 'Test trend with thumbnail - Testing complete flow',
      evidence: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Test Trend with Thumbnail',
        platform: 'youtube',
        categories: ['Humor & Memes'],
        moods: ['Playful'],
        ageRanges: ['18-24'],
        spreadSpeed: 'picking_up'
      },
      status: 'submitted',
      virality_prediction: 7,
      quality_score: 0.7,
      validation_count: 0,
      thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      post_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      wave_score: 8,
      creator_handle: '@test_user',
      creator_name: 'Test User',
      post_caption: 'This is a test trend submission with thumbnail',
      likes_count: 1000,
      comments_count: 50,
      views_count: 10000,
      hashtags: ['test', 'trending', 'wavesight']
    };

    console.log('Submitting test trend with:');
    console.log('- Thumbnail URL:', testSubmission.thumbnail_url);
    console.log('- Wave Score:', testSubmission.wave_score);
    console.log('- Post URL:', testSubmission.post_url);
    console.log('\n');

    // Submit to database
    const { data, error } = await supabase
      .from('trend_submissions')
      .insert(testSubmission)
      .select()
      .single();

    if (error) {
      console.error('❌ Submission failed:', error);
      return;
    }

    console.log('✅ Trend submitted successfully!');
    console.log('Submission ID:', data.id);
    console.log('\n');

    // Now verify it was saved correctly
    console.log('Verifying saved data...');
    const { data: verification, error: verifyError } = await supabase
      .from('trend_submissions')
      .select('id, thumbnail_url, wave_score, post_url, created_at')
      .eq('id', data.id)
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return;
    }

    console.log('\nVERIFICATION RESULTS:');
    console.log('=====================');
    console.log('ID:', verification.id);
    console.log('Thumbnail URL:', verification.thumbnail_url || 'NOT SAVED ❌');
    console.log('Wave Score:', verification.wave_score || 'NOT SAVED ❌');
    console.log('Post URL:', verification.post_url || 'NOT SAVED ❌');
    console.log('Created:', new Date(verification.created_at).toLocaleString());

    // Check if all fields were saved
    const allFieldsSaved = verification.thumbnail_url && 
                          verification.wave_score !== null && 
                          verification.post_url;

    if (allFieldsSaved) {
      console.log('\n✅ SUCCESS! All fields were saved correctly.');
      console.log('The thumbnail should now appear on the Timeline page.');
    } else {
      console.log('\n⚠️  WARNING: Some fields were not saved correctly.');
      console.log('This needs to be investigated further.');
    }

    // Optional: Clean up test submission
    console.log('\nCleaning up test submission...');
    const { error: deleteError } = await supabase
      .from('trend_submissions')
      .delete()
      .eq('id', data.id);

    if (!deleteError) {
      console.log('✅ Test submission cleaned up.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testSubmissionFlow().catch(console.error);