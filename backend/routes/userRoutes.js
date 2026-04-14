const express = require('express');
const router = express.Router();
const db = require('../db'); // This brings in your database connection

// Route to create a new user
router.post('/', async (req, res) => {
    try {
        const { name, email } = req.body;

        // The SQL command to insert a new user and return their data
        const newUser = await db.query(
            "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
            [name, email]
        );

        // Send the newly created user back as a success response
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;