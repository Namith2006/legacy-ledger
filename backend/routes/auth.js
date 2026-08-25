const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST /api/auth/demo
router.post('/demo', (req, res) => {
    const demoUser = { id: 1, name: 'demo' };
    const secret = process.env.JWT_SECRET || 'legacy_ledger_secret_key';
    const token = jwt.sign(demoUser, secret, { expiresIn: '7d' });
    res.json({ success: true, token, user: demoUser });
});

// POST /api/auth/update-token
// Forces a refresh or instructs the client to synchronize local storage
router.post('/update-token', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'legacy_ledger_secret_key';

    if (!token) {
        const demoUser = { id: 1, name: 'demo' };
        const newToken = jwt.sign(demoUser, secret, { expiresIn: '7d' });
        return res.json({
            action: 'RESET_TOKEN',
            message: 'Issued clean guest token.',
            token: newToken,
            user: demoUser
        });
    }

    try {
        const decoded = jwt.verify(token, secret);
        // Refresh valid token for another 7 days
        const refreshedToken = jwt.sign({ id: decoded.id, name: decoded.name }, secret, { expiresIn: '7d' });
        return res.json({
            action: 'TOKEN_REFRESHED',
            token: refreshedToken,
            user: { id: decoded.id, name: decoded.name }
        });
    } catch (err) {
        // Invalid or expired token: issue fresh token and flag reset
        const fallbackUser = { id: 1, name: 'demo' };
        const freshToken = jwt.sign(fallbackUser, secret, { expiresIn: '7d' });
        return res.status(200).json({
            action: 'CLEAR_AND_RESET',
            message: 'Stale token purged and replaced.',
            token: freshToken,
            user: fallbackUser
        });
    }
});

module.exports = router;