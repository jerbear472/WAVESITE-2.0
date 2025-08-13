const { Client } = require('pg');

// Test different connection formats
const connections = [
  {
    name: 'Direct Connection (db.)',
    url: 'postgresql://postgres:wivbor-tytHet-0toxpi@db.aicahushpcslwjwrlqbo.supabase.co:5432/postgres'
  },
  {
    name: 'Pooler Connection (Transaction)',
    url: 'postgresql://postgres.aicahushpcslwjwrlqbo:wivbor-tytHet-0toxpi@aws-0-us-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true'
  },
  {
    name: 'Pooler Connection (Session)',
    url: 'postgresql://postgres.aicahushpcslwjwrlqbo:wivbor-tytHet-0toxpi@aws-0-us-west-1.pooler.supabase.com:6543/postgres'
  }
];

async function testConnection(config) {
  console.log(`\nTesting: ${config.name}`);
  console.log(`URL: ${config.url.replace(/:[^@]+@/, ':****@')}`); // Hide password in output
  
  const client = new Client({
    connectionString: config.url,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log('✅ Connected successfully!');
    console.log('Database:', result.rows[0].current_database);
    console.log('User:', result.rows[0].current_user);
    await client.end();
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('Testing Supabase connections...\n');
  
  for (const conn of connections) {
    const success = await testConnection(conn);
    if (success) {
      console.log('\n✨ Use this connection string in .env.migration:');
      console.log(conn.url);
      break;
    }
  }
}

main().catch(console.error);