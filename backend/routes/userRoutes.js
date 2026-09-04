const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth'); // 🔒 Import the security middleware

// 1. FETCH ROUTE: Get Current Logged-in User Profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // 🔒 Securely pulled from JWT

        // Fetch user details (strictly excluding the password_hash for security)
        const userResult = await db.query(
            "SELECT id, email, created_at FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(userResult.rows[0]);
    } catch (err) {
        console.error("Profile Fetch Error:", err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;