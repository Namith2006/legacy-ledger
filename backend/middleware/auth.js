const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || token === 'undefined' || token === 'null') {
        return res.status(401).json({ message: 'Access Denied: Missing Token' });
    }

    try {
        const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verifiedUser;
        next(); // Token is good, proceed to the route
    } catch (err) {
        // 🚨 THE FIX: Instantly block the request. Do not pass req.user = null!
        return res.status(401).json({ message: 'Invalid or Expired Token' });
    }
};

module.exports = auth;