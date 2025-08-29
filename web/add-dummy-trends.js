const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDummyTrends() {
  console.log('🎯 Adding dummy trends for testing...\n');
  
  try {
    // Get a user to be the spotter (first available user)
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('No users found. Please create a user account first.');
      return;
    }
    
    const spotterId = users[0].id;
    const spotterUsername = users[0].username || 'TrendSpotter';
    
    console.log(`Using user ${spotterUsername} (${spotterId}) as trend spotter\n`);
    
    // Define the dummy trends
    const dummyTrends = [
      {
        // Stanley Cups Trend
        title: "Stanley Cup Obsession",
        description: "Stanley tumblers are everywhere - limited editions sell out instantly.",
        url: "https://www.tiktok.com/@stanleybrand",
        platform: "tiktok",
        category: "visual_style",
        creator_handle: "@stanleybrand",
        spotter_id: spotterId,
        status: "submitted",
        thumbnail_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400",
        
        // Metadata
        // trend_velocity: "explosive",
        // trend_size: "massive",
        // ai_angle: "Stanley cups have become the ultimate accessory, with limited editions selling out in minutes and resale prices hitting $200+",
        sentiment: 85,
        audience_age: ["18-24", "25-34", "35-44"],
        hashtags: ["#stanleycup", "#stanleytumbler", "#waterbottle", "#hydration"],
        views_count: 45000000,
        likes_count: 2300000,
        comments_count: 125000,
        
        // Origins (commented out - columns don't exist)
        // driving_generation: "Gen Z & Millennials",
        // trend_origin: "Utah mom influencers started the craze, now it's everywhere",
        // evolution_status: "Peak mainstream adoption",
        
        // Voting data (starts at 0)
        // validation_wave_votes: 0,  // Added by triggers
        // validation_fire_votes: 0,
        // validation_dead_votes: 0,
        wave_votes: 0,
        fire_votes: 0,
        declining_votes: 0,
        dead_votes: 0,
        heat_score: 0
      },
      {
        // Roman Empire Trend
        title: "Roman Empire Thoughts",
        description: "Women are shocked to discover that men think about the Roman Empire multiple times a week. This viral trend has people questioning gender differences in random historical thoughts.",
        url: "https://www.tiktok.com/@romanempirethoughts",
        platform: "tiktok",
        category: "audio_music",
        creator_handle: "@historymemes",
        spotter_id: spotterId,
        status: "submitted",
        thumbnail_url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400",
        
        // Metadata
        // trend_velocity: "viral",
        // trend_size: "huge",
        // ai_angle: "Men admitting they think about Roman military tactics, architecture, and Marcus Aurelius way more than anyone expected",
        sentiment: 92,
        audience_age: ["18-24", "25-34", "35-44", "45-54"],
        hashtags: ["#romanempire", "#menthinkabout", "#marcusaurelius", "#history"],
        views_count: 89000000,
        likes_count: 5600000,
        comments_count: 450000,
        
        // Origins (commented out - columns don't exist)
        // driving_generation: "Cross-generational",
        // trend_origin: "Started on Instagram reels, exploded on TikTok",
        // evolution_status: "Still growing",
        
        // Voting data
        // validation_wave_votes: 0,  // Added by triggers
        // validation_fire_votes: 0,
        // validation_dead_votes: 0,
        wave_votes: 0,
        fire_votes: 0,
        declining_votes: 0,
        dead_votes: 0,
        heat_score: 0
      },
      {
        // Throwing a Fit Trend
        title: "Throwing a Fit",
        description: "Fashion influencers 'throw a fit' by showing their outfit of the day with dramatic slow-mo reveals set to phonk music. It's become the standard way to show off your drip.",
        url: "https://www.tiktok.com/@fashiontok",
        platform: "tiktok",
        category: "visual_style",
        creator_handle: "@fitcheck",
        spotter_id: spotterId,
        status: "submitted",
        thumbnail_url: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400",
        
        // Metadata
        // trend_velocity: "steady",
        // trend_size: "large",
        // ai_angle: "Everyone's a model now - dramatic outfit reveals with cinematic editing have democratized fashion content",
        sentiment: 78,
        audience_age: ["16-20", "18-24", "25-34"],
        hashtags: ["#throwingfits", "#fitcheck", "#ootd", "#fashion", "#phonk"],
        views_count: 34000000,
        likes_count: 1900000,
        comments_count: 87000,
        
        // Origins (commented out - columns don't exist)
        // driving_generation: "Gen Z",
        // trend_origin: "NYC fashion TikTokers started it, now global",
        // evolution_status: "Mature but still strong",
        
        // Voting data
        // validation_wave_votes: 0,  // Added by triggers
        // validation_fire_votes: 0,
        // validation_dead_votes: 0,
        wave_votes: 0,
        fire_votes: 0,
        declining_votes: 0,
        dead_votes: 0,
        heat_score: 0
      },
      {
        // Girl Dinner Trend
        title: "Girl Dinner",
        description: "Women are embracing 'girl dinner' - random assortments of snacks that somehow make a meal. Cheese, crackers, olives, and whatever's in the fridge. No cooking required.",
        url: "https://www.tiktok.com/@girldinner",
        platform: "tiktok",
        category: "creator_technique",
        creator_handle: "@chaoticcooking",
        spotter_id: spotterId,
        status: "submitted",
        thumbnail_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
        
        // Metadata
        // trend_velocity: "explosive",
        // trend_size: "massive",
        // ai_angle: "Liberation from cooking expectations - sometimes a handful of grapes and string cheese IS dinner",
        sentiment: 88,
        audience_age: ["18-24", "25-34", "35-44"],
        hashtags: ["#girldinner", "#snackplate", "#nocook", "#charcuterie"],
        views_count: 67000000,
        likes_count: 3400000,
        comments_count: 234000,
        
        // Origins (commented out - columns don't exist)
        // driving_generation: "Millennials & Gen Z",
        // trend_origin: "Started as a joke, became a lifestyle movement",
        // evolution_status: "Peak popularity",
        
        // Voting data
        // validation_wave_votes: 0,  // Added by triggers
        // validation_fire_votes: 0,
        // validation_dead_votes: 0,
        wave_votes: 0,
        fire_votes: 0,
        declining_votes: 0,
        dead_votes: 0,
        heat_score: 0
      },
      {
        // Mob Wife Aesthetic
        title: "Mob Wife Aesthetic",
        description: "Clean girl is out, mob wife is in. Think Carmela Soprano meets modern fashion - big fur coats, gold jewelry, red lips, and unapologetic glamour.",
        url: "https://www.tiktok.com/@mobwifeaesthetic",
        platform: "tiktok",
        category: "visual_style",
        creator_handle: "@aesthetic.style",
        spotter_id: spotterId,
        status: "submitted",
        thumbnail_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
        
        // Metadata
        // trend_velocity: "rising",
        // trend_size: "growing",
        // ai_angle: "Rejection of minimalism - maximalist fashion with attitude is having its moment",
        sentiment: 81,
        audience_age: ["18-24", "25-34"],
        hashtags: ["#mobwife", "#mobwifeaesthetic", "#oldmoney", "#maximalist"],
        views_count: 28000000,
        likes_count: 1600000,
        comments_count: 98000,
        
        // Origins (commented out - columns don't exist)
        // driving_generation: "Gen Z",
        // trend_origin: "Fashion TikTok reaction to 'clean girl' fatigue",
        // evolution_status: "Rising fast",
        
        // Voting data
        // validation_wave_votes: 0,  // Added by triggers
        // validation_fire_votes: 0,
        // validation_dead_votes: 0,
        wave_votes: 0,
        fire_votes: 0,
        declining_votes: 0,
        dead_votes: 0,
        heat_score: 0
      }
    ];
    
    // Insert the dummy trends
    console.log('📝 Inserting trends into database...\n');
    
    for (const trend of dummyTrends) {
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert({
          ...trend,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Failed to add "${trend.title}":`, error.message);
      } else {
        console.log(`✅ Added: "${trend.title}"`);
        console.log(`   Platform: ${trend.platform} | Category: ${trend.category}`);
        console.log(`   Status: ${trend.status} (ready for validation)\n`);
      }
    }
    
    console.log('🎉 Dummy trends added successfully!');
    console.log('\n📍 Next steps:');
    console.log('1. Go to http://localhost:3002/validate');
    console.log('2. Vote on these trends with 3 different accounts');
    console.log('3. After 3 approval votes, they\'ll appear on the Predictions page');
    console.log('4. Test the new interactive prediction chart on approved trends!');
    
  } catch (error) {
    console.error('Error adding dummy trends:', error);
  }
  
  process.exit(0);
}

addDummyTrends();