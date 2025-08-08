// Complete AI Integration Test
require('dotenv').config({ path: '.env.local' });

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testFullIntegration() {
  console.log('🚀 WaveSight AI Integration Test\n');
  console.log('================================\n');

  try {
    // 1. Test OpenAI Classification
    console.log('1️⃣ Testing AI Classification...');
    const classificationResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Classify this trend into a category. Return JSON with: category, confidence (0-1)'
        },
        {
          role: 'user',
          content: 'Mushroom coffee is trending among tech workers'
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100
    });
    
    const classification = JSON.parse(classificationResponse.choices[0].message.content);
    console.log(`   ✅ Category: ${classification.category}`);
    console.log(`   ✅ Confidence: ${(classification.confidence * 100).toFixed(0)}%\n`);

    // 2. Test Entity Extraction
    console.log('2️⃣ Testing Entity Extraction...');
    const entityResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract brands and products. Return JSON with: brands[], products[]'
        },
        {
          role: 'user',
          content: 'Nike and Adidas are launching sustainable sneaker lines'
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100
    });
    
    const entities = JSON.parse(entityResponse.choices[0].message.content);
    console.log(`   ✅ Brands: ${entities.brands.join(', ')}`);
    console.log(`   ✅ Products: ${entities.products.join(', ')}\n`);

    // 3. Test Embedding Generation
    console.log('3️⃣ Testing Embedding Generation...');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'Test trend for vector similarity',
    });
    
    console.log(`   ✅ Generated ${embeddingResponse.data[0].embedding.length}-dimensional vector\n`);

    // 4. Test Supabase Connection
    console.log('4️⃣ Testing Database Connection...');
    const { data: testSelect, error: selectError } = await supabase
      .from('trend_submissions')
      .select('id')
      .limit(1);
    
    if (selectError) {
      console.log(`   ❌ Database error: ${selectError.message}`);
    } else {
      console.log(`   ✅ Database connection successful\n`);
    }

    // 5. Summary
    console.log('================================');
    console.log('✅ AI Integration Test Complete!\n');
    console.log('All systems are operational. You can now:');
    console.log('1. Submit trends with AI processing at /api/trends/submit-ai');
    console.log('2. Access AI-enhanced dashboard at /api/dashboard/ai');
    console.log('3. Run the database migration in Supabase SQL Editor');
    console.log('   (File: /supabase/ai-schema-extensions.sql)');
    console.log('\nTo start the development server:');
    console.log('   npm run dev');
    console.log('\nTo manually trigger background jobs (after migration):');
    console.log('   - Clustering: curl http://localhost:3000/api/cron/cluster-trends');
    console.log('   - Scoring: curl http://localhost:3000/api/cron/score-trends');
    console.log('   - Predictions: curl http://localhost:3000/api/cron/predict-trends');

  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    
    if (error.message.includes('401')) {
      console.log('   Invalid API key. Please check your OpenAI API key.');
    } else if (error.message.includes('429')) {
      console.log('   Rate limit exceeded. Please wait and try again.');
    } else if (error.message.includes('insufficient_quota')) {
      console.log('   OpenAI quota exceeded. Please check your billing.');
    }
  }
}

// Run the test
testFullIntegration();