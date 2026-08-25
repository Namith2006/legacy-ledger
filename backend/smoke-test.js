/**
 * LEGACY LEDGER - SMOKE TEST
 * Run this script to ensure your environment variables, server routing, 
 * and database connections are correctly configured before pushing to production.
 * * Usage: node smoke-test.js
 */

const http = require('http');

const PORT = process.env.PORT || 5000;
const URL = `http://localhost:${PORT}/api/ping`;

console.log('🧪 Starting Legacy Ledger Smoke Test...');
console.log(`📡 Pinging Backend API at ${URL}`);

const request = http.get(URL, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.status === 'healthy' && parsed.database === 'connected') {
          console.log('✅ PASS: Server is running and Database is connected.');
          process.exit(0); // Success
        } else {
          console.log('⚠️ WARNING: Server running, but database returned unexpected state:', parsed);
          process.exit(1);
        }
      } catch (e) {
        console.log('❌ FAIL: Received invalid JSON from health check.');
        process.exit(1);
      }
    } else {
      console.log(`❌ FAIL: Server responded with status code ${res.statusCode}`);
      process.exit(1);
    }
  });
});

request.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log('❌ FAIL: Connection refused. Is the server running? Run `npm run dev` first.');
  } else {
    console.log(`❌ FAIL: Smoke test failed due to network error: ${err.message}`);
  }
  process.exit(1); // Failure
});