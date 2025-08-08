// Quick AI Integration Test
// Run from web directory: node test-ai.js

require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing AI Configuration...\n');

// Check OpenAI key
const apiKey = process.env.OPENAI_API_KEY;
console.log('OpenAI API Key status:');
if (!apiKey || apiKey.trim() === '') {
  console.log('❌ Not configured - Please add your OpenAI API key to web/.env.local');
  console.log('\nEdit web/.env.local and add:');
  console.log('OPENAI_API_KEY=sk-...');
  console.log('\nGet your API key from: https://platform.openai.com/api-keys');
} else {
  console.log('✅ Configured');
  console.log(`   Key starts with: ${apiKey.substring(0, 7)}...`);
  console.log(`   Key length: ${apiKey.length} characters`);
  
  // Test the AI service
  console.log('\nTesting AI Service...');
  testAIService();
}

async function testAIService() {
  try {
    const { aiProcessingService } = require('./lib/aiProcessingService');
    
    console.log('1. Testing trend classification...');
    const result = await aiProcessingService.classifyTrend(
      'Sustainable fashion brands are gaining popularity'
    );
    console.log(`   ✅ Category: ${result.category}`);
    console.log(`   ✅ Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    
    console.log('\n2. Testing entity extraction...');
    const entities = await aiProcessingService.extractEntities(
      'Apple and Google are releasing new AI features'
    );
    console.log(`   ✅ Found ${entities.brands.length} brands: ${entities.brands.join(', ')}`);
    
    console.log('\n3. Testing embedding generation...');
    const embedding = await aiProcessingService.generateEmbedding('test');
    console.log(`   ✅ Generated ${embedding.length}-dimensional vector`);
    
    console.log('\n✅ All AI services working correctly!');
    console.log('\nYou can now:');
    console.log('1. Run background jobs: npm run jobs:all');
    console.log('2. Submit trends with AI: POST /api/trends/submit-ai');
    console.log('3. Access AI dashboard: GET /api/dashboard/ai');
    
  } catch (error) {
    console.log(`\n❌ Error testing AI service: ${error.message}`);
    if (error.message.includes('401')) {
      console.log('   Invalid API key - please check your OpenAI API key');
    } else if (error.message.includes('429')) {
      console.log('   Rate limit exceeded - please wait a moment and try again');
    } else if (error.message.includes('billing')) {
      console.log('   Billing issue - please check your OpenAI account');
    }
  }
}