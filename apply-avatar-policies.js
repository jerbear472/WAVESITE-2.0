#!/usr/bin/env node

// Load environment variables
const dotenv = require('dotenv');
const path = require('path');

// Try to load from web/.env.local
const result = dotenv.config({ path: path.join(__dirname, 'web', '.env.local') });

// Get Supabase URL (we only need the URL for display purposes)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-project.supabase.co';

console.log('🔐 Applying RLS policies for avatars bucket...\n');
console.log('=' .repeat(60));
console.log('IMPORTANT: Run the following SQL in your Supabase Dashboard');
console.log('=' .repeat(60));
console.log('\n1. Go to your Supabase Dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Create a new query');
console.log('4. Copy and paste the contents of fix-avatars-rls.sql');
console.log('5. Run the query\n');

console.log('The SQL file contains policies that will:');
console.log('✅ Allow authenticated users to upload avatars');
console.log('✅ Allow authenticated users to update their avatars');
console.log('✅ Allow authenticated users to delete their avatars');
console.log('✅ Allow anyone to view avatars (public access)\n');

console.log('If you still get RLS errors after running the first set of policies,');
console.log('uncomment the alternative simpler policies at the bottom of the SQL file');
console.log('and run those instead.\n');

console.log('=' .repeat(60));
console.log('📁 File path structure');
console.log('=' .repeat(60));
console.log('\nThe settings page now uploads avatars to:');
console.log(`  ${supabaseUrl}/storage/v1/object/public/avatars/{userId}/avatar-{timestamp}.{ext}`);
console.log('\nThis structure matches the RLS policies that check for user ownership.\n');

console.log('=' .repeat(60));
console.log('🧪 Testing');
console.log('=' .repeat(60));
console.log('\nAfter applying the policies:');
console.log('1. Go to the Settings page in your app');
console.log('2. Try uploading a profile picture');
console.log('3. The upload should work without RLS errors\n');

console.log('If you encounter issues:');
console.log('- Check the browser console for detailed error messages');
console.log('- Verify the policies were applied in Supabase Dashboard > Storage > Policies');
console.log('- Try the simpler alternative policies in the SQL file\n');

console.log('✅ Setup instructions complete!');