const { Pool } = require('pg');
require('dotenv').config();

// Enforces full CA verification if a certificate string is provided (Item 4)
const sslConfig = process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === 'false' ? false : true,
    ca: process.env.DB_CA_CERT // Buyers can inject their Supabase Root CA here
} : false;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig
});

pool.on('connect', () => console.log('🔗 Database Connected!'));
module.exports = pool;