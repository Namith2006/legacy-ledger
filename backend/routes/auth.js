const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// --- 1. REGISTER NEW USER ---
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        // Check if user already exists
        const userCheck = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ message: "User already exists with this email." });
        }

        // Hash the password (cost factor 10 is standard for SaaS)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert into database
        const newUser = await db.query(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            [email, passwordHash]
        );

        // Generate their JWT
        const token = jwt.sign(
            { id: newUser.rows[0].id, email: newUser.rows[0].email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({ 
            message: "Registration successful", 
            token, 
            user: newUser.rows[0] 
        });

    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(500).json({ message: "Server error during registration." });
    }
});

// --- 2. LOGIN EXISTING USER ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const userResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const user = userResult.rows[0];

        // Compare submitted password with the database hash
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Issue token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ message: "Login successful", token });

    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ message: "Server error during login." });
    }
});

// --- 3. GUEST DEMO MODE (Preserved for Testing) ---
router.post('/demo', (req, res) => {
    const demoToken = jwt.sign(
        { id: '00000000-0000-0000-0000-000000000000', role: 'guest' }, // Fallback UUID format
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    res.json({ message: "Demo mode activated", token: demoToken });
});

module.exports = router;