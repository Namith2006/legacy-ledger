const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false 
    }
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