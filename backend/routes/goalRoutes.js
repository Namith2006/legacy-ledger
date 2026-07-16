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

// 2. CREATE ROUTE: Add a new goal
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

// 3. UPDATE ROUTE: Add funds to a goal
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { current_amount } = req.body;
        
        const result = await db.query(
            "UPDATE goals SET current_amount = $1 WHERE id = $2 RETURNING *",
            [current_amount, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Goal not found" });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating goal:", err.message);
        res.status(500).json({ message: "Failed to update goal." });
    }
});

// 4. DELETE ROUTE: Remove a goal completely
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            "DELETE FROM goals WHERE id = $1 RETURNING *",
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Goal not found" });
        }
        
        res.json({ message: "Goal deleted successfully" });
    } catch (err) {
        console.error("Delete Goal Error:", err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;