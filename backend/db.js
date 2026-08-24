const { Pool } = require('pg');
const { logError } = require('./utils/logger'); // 👈 1. Import your new logger
require('dotenv').config();

const useSsl = process.env.DATABASE_SSL === 'true';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? {
        rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED !== 'false'
    } : false
});

pool.on('connect', () => {
    console.log("🔗 Securely connected to the Database!");
});

// 👇 2. Replace console.error with your secure logError function
pool.on('error', (err) => {
    logError("Database connection lost", err); 
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};