require('dotenv').config({ path: '.env.local' });

console.log('Environment check:');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

console.log('\nFirst 50 chars of each:');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 50));
console.log('Anon:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 50));  
console.log('Service:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 50));