const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAvatarSystem() {
  console.log('Setting up avatar system...');
  
  try {
    // Create avatars bucket
    console.log('Creating avatars storage bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      const avatarsBucket = buckets.find(b => b.name === 'avatars');
      
      if (!avatarsBucket) {
        const { data, error } = await supabase.storage.createBucket('avatars', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (error) {
          console.error('Error creating avatars bucket:', error);
        } else {
          console.log('✅ Avatars bucket created successfully');
        }
      } else {
        console.log('✅ Avatars bucket already exists');
      }
    }
    
    // Add columns to profiles table
    console.log('Updating profiles table schema...');
    
    // Note: Since we can't run raw SQL through the JS client, 
    // we'll provide instructions for the user
    console.log(`
📝 Please run the following SQL commands in your Supabase SQL editor:

1. First, run the avatar URL column setup:
   Execute the SQL from: supabase/add_avatar_url_column.sql

2. Then, run the avatars bucket setup:
   Execute the SQL from: supabase/create_avatars_bucket.sql

You can find these files in your WAVESITE2/supabase directory.

To access the SQL editor:
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the SQL from each file
5. Run the queries

Once complete, your avatar system will be fully set up!
`);
    
  } catch (error) {
    console.error('Setup error:', error);
  }
}

setupAvatarSystem();