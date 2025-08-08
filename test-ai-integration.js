// Test script for AI Integration
// Run with: node test-ai-integration.js

require('dotenv').config({ path: './web/.env.local' });

async function testAIIntegration() {
  console.log('🧪 Testing WaveSight AI Integration...\n');
  
  // Check environment variables
  console.log('1️⃣ Checking environment variables...');
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  console.log(`   ✅ OpenAI API Key: ${hasOpenAI ? 'Configured' : '❌ Missing'}`);
  console.log(`   ✅ Supabase URL: ${hasSupabase ? 'Configured' : '❌ Missing'}`);
  
  if (!hasOpenAI) {
    console.log('\n❌ OpenAI API key is not configured. Please add it to .env.local');
    return;
  }
  
  // Test OpenAI connection
  console.log('\n2️⃣ Testing OpenAI connection...');
  try {
    const { aiProcessingService } = require('./web/lib/aiProcessingService');
    
    // Test classification
    console.log('   Testing classification...');
    const classification = await aiProcessingService.classifyTrend(
      'Mushroom coffee is becoming popular among tech workers in Silicon Valley'
    );
    console.log(`   ✅ Classification: ${classification.category} (${(classification.confidence * 100).toFixed(0)}% confidence)`);
    
    // Test entity extraction
    console.log('   Testing entity extraction...');
    const entities = await aiProcessingService.extractEntities(
      'Nike and Adidas are competing with new sustainable sneaker lines'
    );
    console.log(`   ✅ Entities found: ${entities.brands.length} brands, ${entities.products.length} products`);
    
    // Test embedding generation
    console.log('   Testing embedding generation...');
    const embedding = await aiProcessingService.generateEmbedding(
      'Test trend for embedding'
    );
    console.log(`   ✅ Embedding generated: ${embedding.length} dimensions`);
    
  } catch (error) {
    console.log(`   ❌ OpenAI test failed: ${error.message}`);
    console.log('   Please check your API key and billing status');
    return;
  }
  
  // Test Supabase connection
  console.log('\n3️⃣ Testing Supabase connection...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase
      .from('trend_submissions')
      .select('count(*)')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ Supabase connection successful');
  } catch (error) {
    console.log(`   ❌ Supabase test failed: ${error.message}`);
  }
  
  console.log('\n✨ AI Integration test complete!');
  console.log('\nNext steps:');
  console.log('1. Run the database migration in Supabase SQL Editor');
  console.log('2. Test background jobs: npm run jobs:all');
  console.log('3. Test the submit endpoint: POST /api/trends/submit-ai');
}

// Run the test
testAIIntegration().catch(console.error);