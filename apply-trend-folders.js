const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyTrendFolders() {
  console.log('🚀 Starting trend folders setup...\n');

  try {
    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, 'supabase', 'create_trend_folders_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Instructions for setting up trend folders:\n');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy the contents of supabase/create_trend_folders_schema.sql');
    console.log('4. Paste and execute in the SQL Editor\n');

    // Update the trends page
    console.log('📄 Updating trends page to use enhanced version...');
    
    const trendsPagePath = path.join(__dirname, 'web', 'app', '(authenticated)', 'trends', 'page.tsx');
    const enhancedPagePath = path.join(__dirname, 'web', 'app', '(authenticated)', 'trends', 'page.enhanced.tsx');
    
    if (fs.existsSync(enhancedPagePath)) {
      // Backup original
      const backupPath = trendsPagePath + '.backup-' + new Date().toISOString().replace(/:/g, '-');
      if (fs.existsSync(trendsPagePath)) {
        fs.copyFileSync(trendsPagePath, backupPath);
        console.log(`   📦 Original backed up to: ${path.basename(backupPath)}`);
      }
      
      // Copy enhanced version
      fs.copyFileSync(enhancedPagePath, trendsPagePath);
      console.log('   ✅ Enhanced trends page activated\n');
    }

    // Install required dependencies
    console.log('📦 Installing required dependencies...\n');
    console.log('Please run the following command:');
    console.log('   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-hot-toast');
    console.log('   or');
    console.log('   yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-hot-toast\n');

    console.log('✨ Trend folders setup complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Run the SQL migration in Supabase Dashboard');
    console.log('   2. Install the required dependencies');
    console.log('   3. Test the new trends page at /trends');
    console.log('   4. Create your first folder and organize trends\n');

    console.log('🎯 Features added:');
    console.log('   - Hierarchical folder structure');
    console.log('   - Drag-and-drop trend organization');
    console.log('   - Folder colors and icons');
    console.log('   - Search and filter functionality');
    console.log('   - Collaborative folders (future feature)');
    console.log('   - Smart folders with auto-organization');
    console.log('   - Activity tracking');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the setup
applyTrendFolders().catch(console.error);