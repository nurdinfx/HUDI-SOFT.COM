const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const connectionString = 'postgresql://postgres.nusqkygzvbjnjrbggdfo:Laascaanood45@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';
  const schemaPath = path.join(__dirname, '..', '..', 'datel-clinic.system', 'supabase_schema.sql');

  console.log('Connecting to database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    console.log('Reading schema file...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running schema migrations on Supabase...');
    await client.query(schemaSql);
    console.log('Schema migration complete! All tables and indexes created successfully.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
