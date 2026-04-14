const express = require('express');
const router = express.Router();
const db = require('../db');

// Route to create a new financial goal
router.post('/', async (req, res) => {
    try {
        const { user_id, title, target_amount, current_amount } = req.body;
        
        const newGoal = await db.query(
            "INSERT INTO goals (user_id, title, target_amount, current_amount) VALUES ($1, $2, $3, $4) RETURNING *",
            [user_id, title, target_amount, current_amount]
        );

        res.status(201).json(newGoal.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Route to fetch all goals for a specific user
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const allGoals = await db.query(
            "SELECT * FROM goals WHERE user_id = $1",
            [userId]
        );

        res.json(allGoals.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;