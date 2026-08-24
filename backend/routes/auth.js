const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST /api/auth/demo
router.post('/demo', (req, res) => {
    const demoUser = {
        id: 1,
        username: 'demo_user',
        email: 'demo@legacyledger.local'
    };

    const secret = process.env.JWT_SECRET || 'legacy_ledger_secret_key';
    const token = jwt.sign(demoUser, secret, { expiresIn: '7d' });

    res.json({
        success: true,
        token,
        user: demoUser
    });
});

module.exports = router;