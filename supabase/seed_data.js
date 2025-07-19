const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to generate dates
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const hoursAgo = (hours) => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

async function seedDatabase() {
  console.log('🌊 Starting WaveSight database seeding...');

  try {
    // 1. Create or use a test user ID
    console.log('Setting up test user...');
    // For seeding purposes, we'll use a static UUID
    // In production, users would be created through the auth flow
    const demoUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    
    // First, insert a user record in the users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', demoUserId)
      .single();
    
    if (!existingUser) {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: demoUserId,
          email: 'demo@wavesight.com',
          username: 'demo_user',
          display_name: 'Demo User',
          bio: 'Testing WaveSight platform',
          wave_points: 100,
          reputation_score: 0.85
        });
      
      if (userError) {
        console.log('User might already exist:', userError.message);
      }
    }
    
    const demoUser = { id: demoUserId };

    // 2. Create trend submissions with timeline data
    console.log('Creating trend submissions...');
    const trends = [
      {
        spotter_id: demoUser.id,
        category: 'visual_style',
        description: 'Neon gradient overlays on portrait videos - seeing 300% increase across TikTok beauty creators',
        virality_prediction: 8,
        quality_score: 0.85,
        validation_count: 15,
        status: 'approved',
        bounty_amount: 250,
        created_at: daysAgo(5),
        validated_at: daysAgo(4),
        evidence: {
          examples: ['@creator1', '@creator2', '@creator3'],
          growth_rate: '300% in 7 days'
        }
      },
      {
        spotter_id: demoUser.id,
        category: 'audio_music',
        description: 'Slowed + reverb versions of 90s R&B hits mixed with trap beats',
        virality_prediction: 9,
        quality_score: 0.92,
        validation_count: 23,
        status: 'viral',
        bounty_amount: 500,
        created_at: daysAgo(10),
        validated_at: daysAgo(9),
        mainstream_at: daysAgo(3),
        evidence: {
          examples: ['#SlowedRnB', '#90sRemix'],
          growth_rate: '500% in 14 days'
        }
      },
      {
        spotter_id: demoUser.id,
        category: 'creator_technique',
        description: 'Split-screen tutorials where creator shows "expectation vs reality" simultaneously',
        virality_prediction: 7,
        quality_score: 0.78,
        validation_count: 12,
        status: 'approved',
        bounty_amount: 175,
        created_at: daysAgo(3),
        validated_at: daysAgo(2),
        evidence: {
          examples: ['Tutorial format spreading', 'High engagement rates'],
          growth_rate: '200% in 5 days'
        }
      },
      {
        spotter_id: demoUser.id,
        category: 'meme_format',
        description: 'POV: You\'re the main character but everyone else has the script',
        virality_prediction: 9,
        quality_score: 0.88,
        validation_count: 8,
        status: 'validating',
        bounty_amount: 0,
        created_at: hoursAgo(18),
        evidence: {
          examples: ['Early adoption by comedy creators'],
          growth_rate: 'Just emerging'
        }
      },
      {
        spotter_id: demoUser.id,
        category: 'product_brand',
        description: 'Rhode lip tint being used as blush - beauty hack going viral',
        virality_prediction: 6,
        quality_score: 0.72,
        validation_count: 19,
        status: 'approved',
        bounty_amount: 125,
        created_at: daysAgo(7),
        validated_at: daysAgo(6),
        evidence: {
          examples: ['Beauty influencers adopting', 'Product selling out'],
          growth_rate: '150% in 10 days'
        }
      }
    ];

    const { data: trendData, error: trendError } = await supabase
      .from('trend_submissions')
      .insert(trends)
      .select();

    if (trendError) throw trendError;
    console.log(`✅ Created ${trendData.length} trend submissions`);

    // 3. Create timeline data (wave scores over time)
    console.log('Creating timeline data...');
    const timelineData = [];
    
    // For each trend, create timeline data points
    for (const trend of trendData) {
      const dataPoints = 20; // 20 data points per trend
      const startDays = 10; // Start from 10 days ago
      
      for (let i = 0; i < dataPoints; i++) {
        const daysOffset = startDays - (i * 0.5); // Every 12 hours
        const progress = i / dataPoints;
        
        // Simulate wave score growth pattern
        let waveScore;
        if (trend.status === 'viral') {
          // Exponential growth for viral trends
          waveScore = Math.min(100, 10 + (90 * Math.pow(progress, 2)));
        } else if (trend.status === 'approved') {
          // Steady growth for approved trends
          waveScore = Math.min(80, 10 + (70 * progress));
        } else {
          // Slow growth for validating trends
          waveScore = Math.min(50, 5 + (45 * progress * 0.5));
        }
        
        timelineData.push({
          trend_id: trend.id,
          timestamp: daysAgo(daysOffset),
          wave_score: Math.round(waveScore),
          validation_count: Math.floor(trend.validation_count * progress),
          engagement_rate: Math.random() * 0.3 + 0.1, // 10-40% engagement
          platform_reach: Math.floor(Math.random() * 1000000) + 10000
        });
      }
    }

    // The timeline table should be created in Supabase dashboard
    // Let's try to insert the data

    // Insert timeline data
    const { data: timelineInserted, error: timelineError } = await supabase
      .from('trend_timeline')
      .insert(timelineData)
      .select();

    if (timelineError) {
      console.log('Timeline table might not exist, creating it...');
      // If the table doesn't exist, we'll need to create it through Supabase dashboard
      console.log('Please run the following SQL in Supabase SQL editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS trend_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  wave_score INTEGER CHECK (wave_score >= 0 AND wave_score <= 100),
  validation_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(3,2),
  platform_reach INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_trend_id ON trend_timeline(trend_id);
CREATE INDEX IF NOT EXISTS idx_timeline_timestamp ON trend_timeline(timestamp);
      `);
    } else {
      console.log(`✅ Created ${timelineInserted.length} timeline data points`);
    }

    // 4. Create some trend validations
    console.log('Creating trend validations...');
    const validations = [];
    
    for (const trend of trendData.filter(t => t.validation_count > 0)) {
      // Create a few validations for each trend
      const numValidations = Math.min(5, trend.validation_count);
      for (let i = 0; i < numValidations; i++) {
        validations.push({
          trend_id: trend.id,
          validator_id: demoUser.id, // In real app, these would be different users
          confirmed: Math.random() > 0.2, // 80% positive validations
          notes: 'Confirmed seeing this trend spreading rapidly',
          reward_amount: 2.0,
          created_at: daysAgo(Math.random() * 5)
        });
      }
    }

    const { error: validationError } = await supabase
      .from('trend_validations')
      .insert(validations);

    if (validationError) {
      console.log('Validation error (might be due to unique constraint):', validationError);
    } else {
      console.log(`✅ Created ${validations.length} trend validations`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 You can now view the trends in your dashboard at http://localhost:3000/dashboard');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

// Run the seeding
seedDatabase();