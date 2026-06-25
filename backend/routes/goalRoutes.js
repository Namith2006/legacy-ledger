const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. FETCH ROUTE: Get all goals
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await db.query(
            "SELECT * FROM goals WHERE user_id = $1 ORDER BY id ASC", 
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch Goals Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// 2. CREATE ROUTE: Add a new goal (THE NEW FEATURE)
router.post('/', async (req, res) => {
    try {
        const { user_id, title, target_amount, current_amount } = req.body;
        
        const newGoal = await db.query(
            "INSERT INTO goals (user_id, title, target_amount, current_amount) VALUES ($1, $2, $3, $4) RETURNING *",
            [user_id, title, target_amount, current_amount || 0]
        );
        
        res.status(201).json(newGoal.rows[0]);
    } catch (err) {
        console.error("Create Goal Error:", err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;