// Test login script
const testAuth = async () => {
  const response = await fetch('http://localhost:3001/api/test-auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'test1755800878902@wavesight.com',
      password: 'TestPassword123!'
    })
  });
  
  const data = await response.json();
  console.log('Login test result:', data);
};

testAuth();