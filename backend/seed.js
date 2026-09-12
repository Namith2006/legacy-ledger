require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');

async function seedDatabase() {
    try {
        console.log("🌱 Starting database seeding process...");

        // 1. Clear existing demo data to prevent duplicates
        await db.query("DELETE FROM users WHERE email = 'buyer@legacyledger.com'");

        // 2. Create the Demo Buyer Account
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('demo123', salt);
        const userRes = await db.query(
            "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'user') RETURNING id",
            ['buyer@legacyledger.com', hash]
        );
        const demoUserId = userRes.rows[0].id;

        // 3. Inject Realistic Transactions (Cash Flow)
        await db.query(`
            INSERT INTO transactions (user_id, type, amount, category, description) VALUES 
            ($1, 'income', 150000, 'Salary', 'Tech Lead Monthly Salary'),
            ($1, 'expense', 25000, 'Housing', 'Apartment Rent'),
            ($1, 'expense', 4500, 'Food', 'Groceries & Dining')
        `, [demoUserId]);

        // 4. Inject Financial Goals
        await db.query(`
            INSERT INTO goals (user_id, title, target_amount, current_amount) VALUES 
            ($1, 'Emergency Fund', 500000, 200000),
            ($1, 'New Car Downpayment', 300000, 50000)
        `, [demoUserId]);

        // 5. Inject War Room Assets (Including the Digital Gold engine we just built)
        await db.query(`
            INSERT INTO active_investments (user_id, asset_name, asset_symbol, entry_price, quantity, status) VALUES 
            ($1, 'Reliance Industries', 'RELIANCE.NS', 2800.50, 15, 'HOLDING'),
            ($1, 'Tata Consultancy', 'TCS.NS', 3900.00, 10, 'HOLDING'),
            ($1, 'Digital Gold', 'DIGITALGOLD', 14500, 2.5, 'HOLDING')
        `, [demoUserId]);

        console.log("✅ Seeding complete! Demo user 'buyer@legacyledger.com' (PW: demo123) is ready.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
}

seedDatabase();