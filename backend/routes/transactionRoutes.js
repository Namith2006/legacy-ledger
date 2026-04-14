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

// 2. THE MISSING ROUTE: Fetch all transactions for the dashboard
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Grab all transactions for this user, newest first
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

// 3. Route to calculate the total balance for a user
router.get('/balance/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Fetch all of the user's money data
        const transactions = await db.query(
            "SELECT type, amount FROM transactions WHERE user_id = $1",
            [userId]
        );

        let totalIncome = 0;
        let totalExpense = 0;

        // Sort through the data and do the math
        transactions.rows.forEach(t => {
            if (t.type === 'income') {
                totalIncome += parseFloat(t.amount);
            } else if (t.type === 'expense') {
                totalExpense += parseFloat(t.amount);
            }
        });

        // Calculate the final net worth
        const currentBalance = totalIncome - totalExpense;

        // Send the final report back to the user
        res.json({
            message: "Financial Summary",
            totalIncome: totalIncome,
            totalExpense: totalExpense,
            netBalance: currentBalance
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// 4. Route to delete a specific transaction
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        
        const deleteOp = await db.query(
            "DELETE FROM transactions WHERE id = $1 RETURNING *",
            [id]
        );

        if (deleteOp.rows.length === 0) {
            return res.status(404).json({ message: "Transaction not found!" });
        }

        res.json({ message: "Transaction deleted successfully!" });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// THE STOP SIGN GOES AT THE VERY END!
module.exports = router;