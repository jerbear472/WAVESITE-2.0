require('dotenv').config({ path: './web/.env.local' });

console.log('🔍 Verifying Submit Flow Configuration\n');

// Check environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

let allEnvVarsPresent = true;
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`❌ ${varName}: Missing`);
    allEnvVarsPresent = false;
  }
});

console.log('\n📋 Submit Flow Summary:');
console.log('1. User clicks "Submit New Trend" button');
console.log('2. TrendSubmissionForm modal opens');
console.log('3. User fills in:');
console.log('   - URL and Title (Step 1)');
console.log('   - Platform and Category (Step 2)');
console.log('   - Social media metadata (optional)');
console.log('   - Reviews submission (Step 3)');
console.log('4. On submit:');
console.log('   - Data saved to trend_submissions table');
console.log('   - User redirected to /timeline');
console.log('   - Trend appears in user\'s timeline');

if (allEnvVarsPresent) {
  console.log('\n✅ Environment is configured correctly!');
  console.log('\n🚀 Next Steps:');
  console.log('1. Ensure social media columns exist in database (run add_social_media_metadata.sql)');
  console.log('2. Visit http://134.199.179.19/submit');
  console.log('3. Click "Submit New Trend" button');
  console.log('4. Fill in the form and submit');
  console.log('5. Check http://134.199.179.19/timeline to see your submission');
} else {
  console.log('\n❌ Missing environment variables. Check your .env.local file.');
}

console.log('\n📝 Note: The database must have the social media metadata columns.');
console.log('Run this SQL if not already done:');
console.log('cat supabase/add_social_media_metadata.sql | pbcopy');