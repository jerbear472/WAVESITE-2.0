import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugTrendSubmission() {
  console.log('🔍 Starting Trend Submission Debug...\n');

  try {
    // 1. Check authentication
    console.log('1️⃣ Checking authentication...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error('❌ Authentication error:', authError || 'No session found');
      console.log('Please ensure you are logged in');
      return;
    }
    
    const userId = session.user.id;
    console.log('✅ Authenticated as user:', userId);
    console.log('Email:', session.user.email);

    // 2. Check user's existing trends
    console.log('\n2️⃣ Fetching existing trends...');
    const { data: existingTrends, error: fetchError } = await supabase
      .from('trend_submissions')
      .select('id, description, status, created_at')
      .eq('spotter_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('❌ Error fetching trends:', fetchError);
    } else {
      console.log(`✅ Found ${existingTrends?.length || 0} trends`);
      if (existingTrends && existingTrends.length > 0) {
        console.log('Recent trends:');
        existingTrends.forEach(trend => {
          console.log(`  - ${trend.description} (${trend.status}) - ${new Date(trend.created_at).toLocaleString()}`);
        });
      }
    }

    // 3. Test inserting a new trend
    console.log('\n3️⃣ Testing trend insertion...');
    const testTrend = {
      spotter_id: userId,
      category: 'meme_format',
      description: `Debug Test Trend - ${new Date().toISOString()}`,
      status: 'submitted',
      quality_score: 0.5,
      validation_count: 0,
      post_url: 'https://example.com/test',
      evidence: {
        test: true,
        timestamp: new Date().toISOString()
      }
    };

    console.log('Inserting test trend:', testTrend);
    
    const { data: insertedTrend, error: insertError } = await supabase
      .from('trend_submissions')
      .insert(testTrend)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting trend:', insertError);
      console.error('Error details:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✅ Trend inserted successfully:', insertedTrend);
    }

    // 4. Immediately try to fetch the inserted trend
    if (insertedTrend) {
      console.log('\n4️⃣ Verifying trend retrieval...');
      const { data: verifyTrend, error: verifyError } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('id', insertedTrend.id)
        .single();

      if (verifyError) {
        console.error('❌ Error retrieving inserted trend:', verifyError);
      } else {
        console.log('✅ Trend retrieved successfully:', verifyTrend);
      }

      // 5. Check if it appears in user's trends list
      console.log('\n5️⃣ Checking if trend appears in user\'s list...');
      const { data: userTrends, error: listError } = await supabase
        .from('trend_submissions')
        .select('id, description, status')
        .eq('spotter_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (listError) {
        console.error('❌ Error fetching user trends:', listError);
      } else {
        const foundNewTrend = userTrends?.find(t => t.id === insertedTrend.id);
        if (foundNewTrend) {
          console.log('✅ New trend appears in user\'s list');
        } else {
          console.error('❌ New trend NOT found in user\'s list');
          console.log('User trends:', userTrends);
        }
      }

      // 6. Clean up test trend
      console.log('\n6️⃣ Cleaning up test trend...');
      const { error: deleteError } = await supabase
        .from('trend_submissions')
        .delete()
        .eq('id', insertedTrend.id);

      if (deleteError) {
        console.error('❌ Error deleting test trend:', deleteError);
      } else {
        console.log('✅ Test trend cleaned up');
      }
    }

    // 7. Check RLS policies
    console.log('\n7️⃣ Checking RLS policies...');
    console.log('Note: RLS policies can only be fully checked from the Supabase dashboard');
    console.log('Common RLS issues:');
    console.log('- Make sure users can SELECT their own trends (spotter_id = auth.uid())');
    console.log('- Make sure users can INSERT trends with their own spotter_id');
    console.log('- Check if there are any additional conditions in the policies');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the debug
debugTrendSubmission();