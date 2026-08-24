const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null; // No token? Pass as guest so they can log in
        return next();
    }

    try {
        const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verifiedUser;
        next();
    } catch (err) {
        req.user = null; // Bad token? Pass as guest
        next();
    }
};

module.exports = auth;