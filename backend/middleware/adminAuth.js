const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: 'Missing Authorization' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // 🔒 The crucial check: Is this user an admin?
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admin access required.' });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = adminAuth;