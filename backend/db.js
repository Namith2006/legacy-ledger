const { Pool } = require('pg');
require('dotenv').config();

// 1. Check if the environment wants SSL enabled at all
const useSsl = process.env.DATABASE_SSL === 'true';

// 2. Configure the database pool dynamically
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? {
        // If DB_REJECT_UNAUTHORIZED is explicitly 'false', it turns off strict checking.
        // Otherwise, it defaults to true (secure) for safety!
        rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED !== 'false'
    } : false
});

pool.on('connect', () => {
    console.log("🔗 Securely connected to the Database!");
});

pool.on('error', (err) => {
    console.error("❌ Database connection error:", err.stack);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};