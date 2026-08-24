const { Pool } = require('pg');
require('dotenv').config();

const isSSL = process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production';
const rejectUnauthorized = process.env.DB_REJECT_UNAUTHORIZED === 'true';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isSSL
        ? {
              rejectUnauthorized: rejectUnauthorized
          }
        : false
});

pool.on('connect', () => {
    console.log('🔗 Securely connected to the Database!');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err);
});

module.exports = pool;