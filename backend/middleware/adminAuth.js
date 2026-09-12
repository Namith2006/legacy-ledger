const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: 'Missing Authorization' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 👑 THE MASTER KEY
        // You can change this email right here, or set it securely in Render's environment variables
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'namithmr3@gmail.com';
        
        if (decoded.email !== ADMIN_EMAIL) {
            return res.status(403).json({ message: 'Intrusion Blocked: Superadmin clearance required.' });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = adminAuth;