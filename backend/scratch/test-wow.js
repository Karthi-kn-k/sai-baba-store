const { Client } = require('pg');

const host = 'pooler.ap-south.db.wowsql.com';
const user = 'user_28d51f291a98a0a3.sai-store-20b34de1';
const pass = 'Karthi@22';
const database = 'wowsql';

async function test() {
  for (const port of [6543, 5432]) {
    console.log(`Testing WowSQL Port ${port} using Karthi@22...`);
    const client = new Client({
      host,
      port,
      database,
      user,
      password: pass,
      ssl: false,
      connectionTimeoutMillis: 10000
    });
    try {
      await client.connect();
      console.log(`\n🎉 SUCCESS! Connected to port ${port}!\n`);
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
    }
    console.log('------------------------------------');
  }
  console.log('All connection attempts failed.');
}

test();
