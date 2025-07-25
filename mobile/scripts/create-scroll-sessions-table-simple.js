const fs = require('fs');
const path = require('path');

console.log('🚀 Scroll Sessions Table Migration');
console.log('==================================\n');

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '003_create_scroll_sessions.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📋 Please run the following SQL in your Supabase SQL editor:\n');
console.log(migrationSQL);
console.log('\n🔗 Steps to execute:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to the SQL Editor');
console.log('3. Copy the SQL above');
console.log('4. Paste it in the editor');
console.log('5. Click "Run" to execute');
console.log('\n✨ This will create the scroll_sessions table needed for the app.');