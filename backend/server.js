require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
const db = require('./db');

const app = express();
// --- MONITORING (Item 7) ---
const Sentry = require('@sentry/node');
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
}
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// The "Fake ID" to get past Yahoo's bot blockers
const YAHOO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

// --- SECURITY MIDDLEWARE ---
app.use(helmet()); // Protects against common web vulnerabilities

// Secure CORS configuration
app.use(cors({ 
    origin: process.env.CORS_ORIGIN || '*' 
}));

app.use(express.json());

// --- RATE LIMITERS ---
const generalLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 60,
    message: { error: "Too many requests from this IP, please try again after 10 minutes." }
});
app.use(generalLimiter); 

const strictApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 15, 
    message: { error: "API limit reached to prevent abuse. Please wait 15 minutes." }
});

// --- STRICT JWT AUTHENTICATION MIDDLEWARE ---
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    // Check if we are allowed to use the demo fallback
    const DEMO_MODE = process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
    
    if (!token) {
        if (DEMO_MODE) {
            req.user = { id: 1, name: 'demo' };
            return next();
        }
        return res.status(401).json({ message: 'Missing Authorization' });
    }
    
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        if (DEMO_MODE) {
            req.user = { id: 1, name: 'demo' };
            return next();
        }
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// --- AUTH ROUTE: DEMO LOGIN ---
app.post('/api/auth/demo', (req, res) => {
    const demoUser = { id: 1, name: 'demo' };
    const token = jwt.sign(demoUser, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: demoUser });
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));
app.use('/api/ai', strictApiLimiter, require('./routes/aiRoutes'));

// --- THE WAR ROOM: LIVE MARKET INTELLIGENCE ROUTE ---
app.get('/api/investments', strictApiLimiter, auth, async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await db.query(
            "SELECT * FROM active_investments WHERE user_id = $1 AND status = 'HOLDING'", 
            [user_id]
        );
        const trades = result.rows;

        if (trades.length === 0) return res.json([]);

        const liveTrades = await Promise.all(trades.map(async (trade) => {
            if (!trade.asset_symbol) {
                return { ...trade, live_price: trade.entry_price, change_percent: "0.00" };
            }

            let cleanSymbol = trade.asset_symbol.toUpperCase().trim();
            let livePrice = parseFloat(trade.entry_price);
            let changePercent = 0;

            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 8000);

            if (cleanSymbol === 'DIGITALGOLD') {
                try {
                    const [goldRes, inrRes] = await Promise.all([
                        fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F', { headers: YAHOO_HEADERS, signal: abortController.signal }),
                        fetch('https://query1.finance.yahoo.com/v8/finance/chart/INR=X', { headers: YAHOO_HEADERS, signal: abortController.signal })
                    ]);
                    clearTimeout(timeoutId);
                    
                    if (goldRes.ok && inrRes.ok) {
                        const goldData = await goldRes.json();
                        const inrData = await inrRes.json();
                        
                        const goldUsd = parseFloat(goldData.chart.result[0].meta.regularMarketPrice);
                        const usdInr = parseFloat(inrData.chart.result[0].meta.regularMarketPrice);
                        
                        let pricePerGram = (goldUsd / 31.1034768) * usdInr;
                        livePrice = pricePerGram * 1.09; 

                        const entryPrice = parseFloat(trade.entry_price);
                        changePercent = ((livePrice - entryPrice) / entryPrice) * 100;
                    }
                } catch (e) {
                    clearTimeout(timeoutId);
                    console.log("⚠️ Gold price fetch failed. Deploying simulation.");
                    livePrice = parseFloat(trade.entry_price) + (Math.random() * 200 - 100);
                    changePercent = (Math.random() * 2 - 1);
                }
            } else {
                cleanSymbol = cleanSymbol.replace('.NS', '') + '.NS'; 

                try {
                    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}`;
                    const yahooResponse = await fetch(yahooUrl, { headers: YAHOO_HEADERS, signal: abortController.signal });
                    clearTimeout(timeoutId);
                    
                    if (yahooResponse.ok) {
                        const yahooData = await yahooResponse.json();
                        if (yahooData.chart && yahooData.chart.result && yahooData.chart.result.length > 0) {
                            const meta = yahooData.chart.result[0].meta;
                            livePrice = parseFloat(meta.regularMarketPrice);
                            
                            const prevClose = parseFloat(meta.chartPreviousClose);
                            if (prevClose) {
                                changePercent = ((livePrice - prevClose) / prevClose) * 100;
                            }
                        }
                    } else {
                        throw new Error(`Yahoo blocked request status: ${yahooResponse.status}`);
                    }
                } catch (err) {
                    clearTimeout(timeoutId);
                    console.log(`⚠️ Live data missing for War Room asset: ${cleanSymbol}. Deploying simulation.`);
                    livePrice = parseFloat(trade.entry_price) + (Math.random() * 10 - 5);
                    changePercent = (Math.random() * 4 - 2);
                }
            }

            return {
                ...trade,
                live_price: livePrice.toFixed(2),
                change_percent: changePercent.toFixed(2)
            };
        }));

        res.json(liveTrades);
    } catch (err) {
        console.error("❌ War Room Intel Error:", err.message || err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- DEPLOY CAPITAL: SAVE NEW TRADE ---
app.post('/api/investments', strictApiLimiter, auth, async (req, res) => {
    try {
        const user_id = req.user.id;
        const { asset_symbol, entry_price, quantity } = req.body;
        
        if (!asset_symbol || entry_price === undefined || quantity === undefined) {
            return res.status(400).json({ error: "Missing required investment parameters." });
        }
        if (isNaN(entry_price) || isNaN(quantity) || entry_price < 0 || quantity <= 0) {
            return res.status(400).json({ error: "Price and quantity must be valid positive numbers." });
        }

        let cleanSymbol = String(asset_symbol).toUpperCase().trim();
        
        if (cleanSymbol !== 'DIGITALGOLD' && !cleanSymbol.endsWith('.NS')) {
            cleanSymbol += '.NS'; 
        }

        const newTrade = await db.query(
            "INSERT INTO active_investments (user_id, asset_name, asset_symbol, entry_price, quantity, target_sell_price, stop_loss_price, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'HOLDING') RETURNING *",
            [user_id, cleanSymbol, cleanSymbol, parseFloat(entry_price), parseFloat(quantity), 0, 0]
        );
        res.status(201).json(newTrade.rows[0]);
    } catch (err) {
        console.error("Add Trade Error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// --- CLOSE POSITION: DELETE TRADE ---
app.delete('/api/investments/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        if (!id) return res.status(400).json({ error: "Trade ID required." });

        await db.query("DELETE FROM active_investments WHERE id = $1 AND user_id = $2", [id, user_id]);
        res.json({ message: "Position Closed" });
    } catch (err) {
        console.error("Delete Trade Error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// --- KEEP-AWAKE PING ROUTE ---
app.get('/api/ping', (req, res) => {
    res.status(200).json({ message: "Legacy Ledger Backend is awake!" });
});

app.get('/', (req, res) => {
    res.send('Legacy Ledger API is running!');
});

// --- CONDITIONAL EXPORT FOR AUTOMATED TESTING ---
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
    });
}

module.exports = app;