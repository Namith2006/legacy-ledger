const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. Route to log a new transaction
router.post('/', async (req, res) => {
    try {
        const { user_id, type, amount, category, description } = req.body;

        const newTransaction = await db.query(
            "INSERT INTO transactions (user_id, type, amount, category, description) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [user_id, type, amount, category, description]
        );

        res.status(201).json(newTransaction.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// 2. FETCH ROUTE: Explicitly get the timestamp
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Explicitly selecting columns ensures you don't miss the updated_at timestamp
        // If your column is named differently (e.g., last_updated), change it here!
        const transactions = await db.query(
            `SELECT id, asset_name, asset_symbol, quantity, entry_price, 
                    stop_loss_price, target_sell_price, live_price, updated_at 
             FROM transactions 
             WHERE user_id = $1 ORDER BY id DESC`,
            [userId]
        );

        res.json(transactions.rows);
    } catch (err) {
        console.error("Fetch Transactions Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// 3. Route to calculate the total balance
router.get('/balance/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const transactions = await db.query(
            "SELECT type, amount FROM transactions WHERE user_id = $1",
            [userId]
        );

        let totalIncome = 0;
        let totalExpense = 0;

        transactions.rows.forEach(t => {
            if (t.type === 'income') totalIncome += parseFloat(t.amount);
            else if (t.type === 'expense') totalExpense += parseFloat(t.amount);
        });

        res.json({
            message: "Financial Summary",
            totalIncome: totalIncome,
            totalExpense: totalExpense,
            netBalance: totalIncome - totalExpense
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// 4. Route to delete a transaction
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const deleteOp = await db.query("DELETE FROM transactions WHERE id = $1 RETURNING *", [id]);

        if (deleteOp.rows.length === 0) {
            return res.status(404).json({ message: "Transaction not found!" });
        }
        res.json({ message: "Transaction deleted successfully!" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;