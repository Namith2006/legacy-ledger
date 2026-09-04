const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// 1. Route to log a new transaction
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // 🔒 Securely pulled from JWT
        const { type, amount, category, description } = req.body;

        const newTransaction = await db.query(
            "INSERT INTO transactions (user_id, type, amount, category, description) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [userId, type, amount, category, description]
        );

        res.status(201).json(newTransaction.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// 2. FETCH ROUTE: Universal Data Fetch
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // 🔒 Securely pulled from JWT
        
        // Using SELECT * ensures we get the timestamp for the War Room, 
        // AND the amount/type/description for the Cash Flow Analytics.
        const transactions = await db.query(
            "SELECT * FROM transactions WHERE user_id = $1 ORDER BY id DESC",
            [userId]
        );

        res.json(transactions.rows);
    } catch (err) {
        console.error("Fetch Transactions Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// 3. Route to calculate the total balance
router.get('/balance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // 🔒 Securely pulled from JWT
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
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params; 
        const userId = req.user.id; // 🔒 Securely pulled from JWT
        
        // 🔒 Added AND user_id = $2 to ensure users can only delete their own data
        const deleteOp = await db.query(
            "DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *", 
            [id, userId]
        );

        if (deleteOp.rows.length === 0) {
            return res.status(404).json({ message: "Transaction not found or you do not have permission to delete it!" });
        }
        res.json({ message: "Transaction deleted successfully!" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;