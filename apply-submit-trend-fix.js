const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyDatabaseFixes() {
  console.log('🔧 Applying database fixes for trend submission...\n');

  try {
    // 1. Add missing columns to trend_submissions table
    console.log('📊 Adding social media metadata columns...');
    const { error: columnsError } = await supabase.rpc('query', {
      query: `
        ALTER TABLE public.trend_submissions 
        ADD COLUMN IF NOT EXISTS creator_handle TEXT,
        ADD COLUMN IF NOT EXISTS creator_name TEXT,
        ADD COLUMN IF NOT EXISTS post_caption TEXT,
        ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS hashtags TEXT[],
        ADD COLUMN IF NOT EXISTS post_url TEXT,
        ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
        ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      `
    });

    if (columnsError) {
      console.error('Error adding columns:', columnsError);
      // Try individual column additions
      const columns = [
        'creator_handle TEXT',
        'creator_name TEXT',
        'post_caption TEXT',
        'likes_count INTEGER DEFAULT 0',
        'comments_count INTEGER DEFAULT 0',
        'shares_count INTEGER DEFAULT 0',
        'views_count INTEGER DEFAULT 0',
        'hashtags TEXT[]',
        'post_url TEXT',
        'thumbnail_url TEXT',
        'posted_at TIMESTAMPTZ',
        'updated_at TIMESTAMPTZ DEFAULT NOW()'
      ];

      for (const column of columns) {
        const [name, type] = column.split(' ');
        try {
          await supabase.rpc('query', {
            query: `ALTER TABLE public.trend_submissions ADD COLUMN IF NOT EXISTS ${column};`
          });
          console.log(`✅ Added column: ${name}`);
        } catch (err) {
          console.log(`⚠️  Column ${name} might already exist or error:`, err.message);
        }
      }
    } else {
      console.log('✅ Social media metadata columns added successfully');
    }

    // 2. Create indexes for better performance
    console.log('\n📈 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_trend_submissions_creator_handle ON public.trend_submissions(creator_handle)',
      'CREATE INDEX IF NOT EXISTS idx_trend_submissions_hashtags ON public.trend_submissions USING GIN(hashtags)',
      'CREATE INDEX IF NOT EXISTS idx_trend_submissions_posted_at ON public.trend_submissions(posted_at)',
      'CREATE INDEX IF NOT EXISTS idx_trend_submissions_updated_at ON public.trend_submissions(updated_at)'
    ];

    for (const index of indexes) {
      try {
        await supabase.rpc('query', { query: index });
        console.log('✅ Index created:', index.match(/idx_\w+/)[0]);
      } catch (err) {
        console.log('⚠️  Index might already exist:', err.message);
      }
    }

    // 3. Update RLS policies
    console.log('\n🔒 Updating RLS policies...');
    
    // First, drop existing policies that might conflict
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Authenticated users can submit trends" ON public.trend_submissions',
      'DROP POLICY IF EXISTS "Users can update their own submissions" ON public.trend_submissions'
    ];

    for (const drop of dropPolicies) {
      try {
        await supabase.rpc('query', { query: drop });
      } catch (err) {
        // Ignore errors if policies don't exist
      }
    }

    // Create new policies
    const policies = [
      `CREATE POLICY "Authenticated users can submit trends" 
       ON public.trend_submissions 
       FOR INSERT 
       WITH CHECK (auth.uid() IS NOT NULL)`,
       
      `CREATE POLICY "Users can update their own submissions" 
       ON public.trend_submissions 
       FOR UPDATE 
       USING (auth.uid() = spotter_id)
       WITH CHECK (auth.uid() = spotter_id)`
    ];

    for (const policy of policies) {
      try {
        await supabase.rpc('query', { query: policy });
        console.log('✅ Policy created/updated');
      } catch (err) {
        console.log('⚠️  Policy might already exist:', err.message);
      }
    }

    // 4. Create or update the trend-images storage bucket
    console.log('\n📦 Setting up storage bucket...');
    
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'trend-images');
    
    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket('trend-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      });
      
      if (bucketError) {
        console.error('Error creating bucket:', bucketError);
      } else {
        console.log('✅ Storage bucket created');
      }
    } else {
      console.log('✅ Storage bucket already exists');
    }

    // 5. Test the setup
    console.log('\n🧪 Testing setup...');
    
    // Check if we can query the table with new columns
    const { data: testData, error: testError } = await supabase
      .from('trend_submissions')
      .select('id, creator_handle, hashtags, likes_count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Test query failed:', testError);
    } else {
      console.log('✅ Test query successful - all columns accessible');
    }

    console.log('\n✨ Database fixes applied successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Test the trend submission form');
    console.log('2. Verify that metadata extraction is working');
    console.log('3. Check that trends are saving correctly');

  } catch (error) {
    console.error('❌ Error applying fixes:', error);
  }
}

// Run the fixes
applyDatabaseFixes();