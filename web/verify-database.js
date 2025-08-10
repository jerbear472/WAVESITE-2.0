// Verify database columns exist and test a manual insert
// Run with: node verify-database.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
  console.log('🔍 VERIFYING DATABASE SETUP');
  console.log('============================\n');

  try {
    // Check if we have a session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('❌ No active session. Please log in through the web app first.');
      return;
    }

    console.log('✅ Authenticated as:', session.user.email);

    // Test a manual insert with thumbnail
    console.log('\n📝 Testing manual insert with thumbnail...');
    
    const testData = {
      spotter_id: session.user.id,
      category: 'meme_format',
      description: 'TEST: Manual thumbnail verification - Rick Roll',
      evidence: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Test YouTube Video',
        platform: 'youtube'
      },
      status: 'submitted',
      virality_prediction: 8,
      quality_score: 0.8,
      validation_count: 0,
      thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      post_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      wave_score: 8
    };

    console.log('Inserting test data:', {
      thumbnail_url: testData.thumbnail_url,
      wave_score: testData.wave_score,
      post_url: testData.post_url
    });

    const { data, error } = await supabase
      .from('trend_submissions')
      .insert(testData)
      .select('id, thumbnail_url, wave_score, post_url')
      .single();

    if (error) {
      console.error('❌ Insert failed:', error);
      return;
    }

    console.log('✅ Test record inserted successfully!');
    console.log('Record ID:', data.id);
    console.log('Saved thumbnail_url:', data.thumbnail_url);
    console.log('Saved wave_score:', data.wave_score);
    console.log('Saved post_url:', data.post_url);

    // Verify it can be retrieved
    console.log('\n🔍 Verifying retrieval...');
    const { data: retrieved, error: retrieveError } = await supabase
      .from('trend_submissions')
      .select('id, thumbnail_url, wave_score, post_url, created_at')
      .eq('id', data.id)
      .single();

    if (retrieveError) {
      console.error('❌ Retrieval failed:', retrieveError);
      return;
    }

    console.log('✅ Record retrieved successfully!');
    console.log('Retrieved data:', retrieved);

    // Check recent submissions
    console.log('\n📊 Recent submissions with thumbnails:');
    const { data: recent } = await supabase
      .from('trend_submissions')
      .select('id, thumbnail_url, wave_score, post_url, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    recent?.forEach((item, i) => {
      console.log(`${i + 1}. ID: ${item.id.substring(0, 8)}...`);
      console.log(`   Thumbnail: ${item.thumbnail_url ? '✅ HAS' : '❌ MISSING'}`);
      console.log(`   Wave Score: ${item.wave_score ?? 'NULL'}`);
      console.log(`   Post URL: ${item.post_url ? '✅ HAS' : '❌ MISSING'}`);
      console.log(`   Created: ${new Date(item.created_at).toLocaleString()}`);
      console.log('');
    });

    // Clean up test record
    console.log('🧹 Cleaning up test record...');
    await supabase
      .from('trend_submissions')
      .delete()
      .eq('id', data.id);
    
    console.log('✅ Test record cleaned up.');

    console.log('\n🎉 DATABASE VERIFICATION COMPLETE!');
    console.log('==================================');
    console.log('✅ Database columns exist and work correctly');
    console.log('✅ Manual insert/retrieve works');
    console.log('✅ Ready for app testing');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyDatabase().catch(console.error);