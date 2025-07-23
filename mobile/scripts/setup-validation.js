// Setup script for validation functionality
// Run this after applying the validation_schema.sql

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupValidation() {
  console.log('🚀 Setting up validation functionality...\n');
  
  try {
    // 1. Check if tables exist
    console.log('📋 Checking database tables...');
    
    const { data: trends, error: trendsError } = await supabase
      .from('captured_trends')
      .select('count')
      .limit(1);
    
    if (trendsError) {
      console.error('❌ captured_trends table not found:', trendsError.message);
      console.log('ℹ️  Please run the validation_schema.sql file in Supabase dashboard first.');
      return;
    }
    
    const { data: validations, error: validationsError } = await supabase
      .from('validations')
      .select('count')
      .limit(1);
    
    if (validationsError) {
      console.error('❌ validations table not found:', validationsError.message);
      console.log('ℹ️  Please run the validation_schema.sql file in Supabase dashboard first.');
      return;
    }
    
    console.log('✅ Database tables exist\n');
    
    // 2. Create test user if needed
    console.log('👤 Setting up test user...');
    
    const testUserId = '11111111-1111-1111-1111-111111111111';
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', testUserId)
      .single();
    
    if (!existingUser) {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: testUserId,
          username: 'test_user',
          trends_spotted: 5,
          validated_trends: 2,
          validations_count: 10,
          accuracy_score: 0.85,
          points: 100
        });
      
      if (userError) {
        console.error('❌ Error creating test user:', userError.message);
      } else {
        console.log('✅ Test user created');
      }
    } else {
      console.log('✅ Test user already exists');
    }
    
    // 3. Insert sample trends if needed
    console.log('\n📱 Checking sample trends...');
    
    const { data: existingTrends, error: countError } = await supabase
      .from('captured_trends')
      .select('id')
      .eq('status', 'pending_validation');
    
    if (!existingTrends || existingTrends.length === 0) {
      console.log('📝 Creating sample trends for validation...');
      
      const sampleTrends = [
        {
          user_id: testUserId,
          url: 'https://tiktok.com/@creator1/video/123',
          platform: 'tiktok',
          title: 'New Dance Challenge 🕺',
          description: 'Everyone is doing this new dance move with the trending audio',
          hashtags: '#NewDance #TikTokChallenge #Viral',
          status: 'pending_validation',
          validation_count: 3,
          positive_votes: 2,
          metadata: { views: 50000, likes: 5000 }
        },
        {
          user_id: testUserId,
          url: 'https://instagram.com/p/ABC123/',
          platform: 'instagram',
          title: 'Minimalist Aesthetic Photos 📸',
          description: 'The new trend of super minimalist photography with negative space',
          hashtags: '#Minimalism #Photography #AestheticFeed',
          status: 'pending_validation',
          validation_count: 5,
          positive_votes: 4,
          metadata: { likes: 10000, comments: 500 }
        },
        {
          user_id: testUserId,
          url: 'https://youtube.com/watch?v=XYZ789',
          platform: 'youtube',
          title: 'ASMR Cooking Videos 🍳',
          description: 'Silent cooking videos with enhanced sound effects are trending',
          hashtags: '#ASMR #Cooking #Satisfying',
          status: 'pending_validation',
          validation_count: 7,
          positive_votes: 5,
          metadata: { views: 100000, subscribers: 50000 }
        },
        {
          user_id: testUserId,
          url: 'https://tiktok.com/@creator2/video/456',
          platform: 'tiktok',
          title: 'POV Acting Scenarios 🎭',
          description: 'Creative POV videos where creators act out relatable scenarios',
          hashtags: '#POV #Acting #Relatable',
          status: 'pending_validation',
          validation_count: 2,
          positive_votes: 1,
          metadata: { views: 25000, shares: 1000 }
        },
        {
          user_id: testUserId,
          url: 'https://instagram.com/reel/DEF456/',
          platform: 'instagram',
          title: 'Outfit Transition Reels 👗',
          description: 'Quick outfit changes synced to beat drops in music',
          hashtags: '#OOTD #Fashion #Transitions',
          status: 'pending_validation',
          validation_count: 0,
          positive_votes: 0,
          metadata: { plays: 75000, saves: 2000 }
        }
      ];
      
      const { error: insertError } = await supabase
        .from('captured_trends')
        .insert(sampleTrends);
      
      if (insertError) {
        console.error('❌ Error creating sample trends:', insertError.message);
      } else {
        console.log('✅ Created 5 sample trends for validation');
      }
    } else {
      console.log(`✅ Found ${existingTrends.length} trends ready for validation`);
    }
    
    // 4. Display summary
    console.log('\n📊 Validation System Summary:');
    console.log('================================');
    
    const { data: pendingTrends } = await supabase
      .from('captured_trends')
      .select('id, title, platform, validation_count')
      .eq('status', 'pending_validation')
      .order('captured_at', { ascending: true })
      .limit(5);
    
    if (pendingTrends && pendingTrends.length > 0) {
      console.log('\n🔍 Trends ready for validation:');
      pendingTrends.forEach((trend, index) => {
        console.log(`${index + 1}. [${trend.platform}] ${trend.title} (${trend.validation_count} votes)`);
      });
    }
    
    console.log('\n✅ Validation system is ready!');
    console.log('📱 Open the app and navigate to the Validation screen to start validating trends.');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

// Run the setup
setupValidation();