const express = require('express');
const router = express.Router();
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');

// Get all users and platform macro-stats
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        // Fetch all registered users
        const usersResult = await db.query('SELECT id, email, created_at, role FROM users ORDER BY created_at DESC');
        
        // Fetch platform-wide totals (to show buyers the app's scale)
        const statsResult = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM active_investments) as total_active_trades,
                (SELECT SUM(amount) FROM transactions) as total_platform_transaction_volume
        `);

        res.json({
            users: usersResult.rows,
            platform_stats: statsResult.rows[0]
        });
    } catch (err) {
        console.error("Admin Dashboard Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;