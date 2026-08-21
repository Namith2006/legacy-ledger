const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = (req, res, next) => {
    // 1. Look for the token in the headers (Format: "Bearer <token>")
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // 2. If no token exists, reject the request
    if (!token) {
        return res.status(401).json({ error: "Access Denied: No Token Provided!" });
    }

    // 3. Verify the token using your secret key
    try {
        const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verifiedUser; // Attach the user payload { id: 1, name: 'demo' } to the request
        next(); // Proceed to the actual route
    } catch (err) {
        res.status(401).json({ error: "Invalid or Expired Token." });
    }
};

module.exports = auth;