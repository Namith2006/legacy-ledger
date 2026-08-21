const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // IMPROVEMENT: Dynamically apply SSL. 
    // Uses SSL in production (Supabase/Render) but disables it for local testing.
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
    console.log('✅ Successfully connected to the Supabase Cloud Vault!');
});

pool.on('error', (err) => {
    console.error('❌ Cloud Database Connection Error:', err.stack);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};