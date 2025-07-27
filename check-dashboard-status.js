const http = require('http');

function checkEndpoint(url, description) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      if (res.statusCode === 200 || res.statusCode === 302) {
        console.log(`✅ ${description} - OK (${res.statusCode})`);
      } else {
        console.log(`⚠️  ${description} - Status: ${res.statusCode}`);
      }
      resolve();
    }).on('error', (err) => {
      console.log(`❌ ${description} - Error: ${err.message}`);
      resolve();
    });
  });
}

async function checkDashboardStatus() {
  console.log('🔍 Checking Enterprise Dashboard Status...\n');

  // Check if server is running
  await checkEndpoint('http://localhost:3001', 'Development Server');
  
  // Check key pages
  await checkEndpoint('http://localhost:3001/login', 'Login Page');
  await checkEndpoint('http://localhost:3001/pricing', 'Pricing Page');
  await checkEndpoint('http://localhost:3001/enterprise/dashboard', 'Enterprise Dashboard');
  
  console.log('\n📝 Access Instructions:');
  console.log('1. Open your browser');
  console.log('2. Go to: http://localhost:3001/login');
  console.log('3. Login with:');
  console.log('   Email: enterprise@test.com');
  console.log('   Password: test123456');
  console.log('4. After login, you\'ll be redirected to the dashboard');
  
  console.log('\n🎯 Direct Links:');
  console.log('- Login: http://localhost:3001/login');
  console.log('- Dashboard: http://localhost:3001/enterprise/dashboard');
  console.log('- Pricing: http://localhost:3001/pricing');
}

checkDashboardStatus();