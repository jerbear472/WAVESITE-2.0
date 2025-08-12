#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './web/.env.local' });

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupAvatarsBucket() {
  console.log('🎨 Setting up avatars storage bucket...\n');

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      throw listError;
    }

    const avatarsBucket = buckets?.find(bucket => bucket.id === 'avatars');
    
    if (avatarsBucket) {
      console.log('✅ Avatars bucket already exists');
      console.log('   Name:', avatarsBucket.name);
      console.log('   Public:', avatarsBucket.public);
      console.log('   Created:', new Date(avatarsBucket.created_at).toLocaleString());
      
      // Update bucket to ensure it's public
      const { data: updateData, error: updateError } = await supabase.storage.updateBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });

      if (updateError) {
        console.log('⚠️  Could not update bucket settings:', updateError.message);
      } else {
        console.log('✅ Bucket settings updated');
      }
    } else {
      // Create the bucket
      console.log('📦 Creating avatars bucket...');
      
      const { data, error: createError } = await supabase.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError.message);
        throw createError;
      }

      console.log('✅ Avatars bucket created successfully!');
    }

    // Test upload capability
    console.log('\n🧪 Testing upload capability...');
    
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = 'This is a test file';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, new Blob([testContent], { type: 'text/plain' }), {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.log('⚠️  Test upload failed:', uploadError.message);
      console.log('    This might be normal if policies restrict uploads.');
    } else {
      console.log('✅ Test upload successful');
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([testFileName]);
      
      if (!deleteError) {
        console.log('✅ Test file cleaned up');
      }
    }

    // Get public URL example
    console.log('\n📍 Public URL pattern for avatars:');
    console.log(`   ${supabaseUrl}/storage/v1/object/public/avatars/[filename]`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log('\nThe avatars bucket is now ready for use!');
    console.log('\nNext steps:');
    console.log('1. Run the SQL policies in Supabase SQL Editor (see create-avatars-bucket.sql)');
    console.log('2. Test uploading a profile picture in the settings page');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message || error);
    
    console.log('\n' + '='.repeat(60));
    console.log('🔧 MANUAL SETUP REQUIRED');
    console.log('='.repeat(60));
    console.log('\n1. Go to your Supabase Dashboard');
    console.log('2. Navigate to Storage');
    console.log('3. Click "New bucket"');
    console.log('4. Enter the following:');
    console.log('   - Name: avatars');
    console.log('   - Public: Yes (toggle on)');
    console.log('   - File size limit: 5MB');
    console.log('   - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp');
    console.log('5. Click "Create bucket"');
    console.log('\nThen run the SQL policies from create-avatars-bucket.sql');
    
    process.exit(1);
  }
}

// Run the setup
setupAvatarsBucket().catch(console.error);