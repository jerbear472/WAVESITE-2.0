const fetch = require('node-fetch');

async function testEnterpriseAPI() {
  console.log('🧪 Testing Enterprise API Endpoints\n');

  const baseUrl = 'http://localhost:3001';
  const apiKey = 'ws_test_zirwz2thyq'; // From the test user creation

  // Test 1: Get trends
  console.log('1️⃣  Testing GET /api/v1/enterprise/trends');
  try {
    const trendsResponse = await fetch(`${baseUrl}/api/v1/enterprise/trends`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const trendsData = await trendsResponse.json();
    
    if (trendsResponse.ok) {
      console.log('✅ Trends API working');
      console.log(`   Found ${trendsData.data?.length || 0} trends`);
    } else {
      console.log('❌ Trends API error:', trendsData.error);
    }
  } catch (error) {
    console.log('❌ Failed to connect to trends API:', error.message);
  }

  // Test 2: Analytics API
  console.log('\n2️⃣  Testing POST /api/v1/enterprise/analytics');
  try {
    const analyticsResponse = await fetch(`${baseUrl}/api/v1/enterprise/analytics`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metrics: ['trend_velocity', 'category_distribution'],
        timeRange: '7d'
      })
    });

    const analyticsData = await analyticsResponse.json();
    
    if (analyticsResponse.ok) {
      console.log('✅ Analytics API working');
      console.log('   Available metrics:', Object.keys(analyticsData.data || {}));
    } else {
      console.log('❌ Analytics API error:', analyticsData.error);
    }
  } catch (error) {
    console.log('❌ Failed to connect to analytics API:', error.message);
  }

  console.log('\n📝 Summary:');
  console.log('- API Key:', apiKey);
  console.log('- Base URL:', baseUrl);
  console.log('\nYou can now access the enterprise dashboard at:');
  console.log(`${baseUrl}/enterprise/dashboard`);
  console.log('\nLogin with:');
  console.log('- Email: enterprise@test.com');
  console.log('- Password: test123456');
}

testEnterpriseAPI().catch(console.error);