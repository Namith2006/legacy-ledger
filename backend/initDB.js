const { Pool } = require('pg');

// 🔴 PASTE YOUR COPIED NEON LINK INSIDE THESE QUOTES 🔴
const myNeonLink = "postgresql://postgres:Namith@Msi25@db.ivccchtxmllaczsebhlg.supabase.co:5432/postgres";

const pool = new Pool({
    connectionString: myNeonLink,
    ssl: { rejectUnauthorized: false }
});

const setupQueries = `
-- 1. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(10) CHECK (type IN ('income', 'expense')) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Goals Table
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0,
    deadline DATE
);

-- 3. AI Strategy Logs Table
CREATE TABLE IF NOT EXISTS ai_strategy_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Insert baseline goals
INSERT INTO goals (user_id, title, target_amount, current_amount) VALUES 
(1, 'MCA Degree Fund', 250000, 45000),
(1, 'Spoil Parents Fund', 100000, 12000);
`;

async function runInjection() {
    try {
        console.log("🚀 Bypassing .env files entirely... Connecting directly...");
        await pool.query(setupQueries);
        console.log("✅ SUCCESS: Tables injected! The Cloud Vault is fully armed.");
    } catch (error) {
        console.error("❌ INJECTION FAILED:", error.message);
    } finally {
        process.exit();
    }
}

runInjection();