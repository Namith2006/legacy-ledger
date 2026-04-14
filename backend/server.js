require('dotenv').config(); // THIS MUST BE LINE 1
const express = require('express');
const cors = require('cors');
const db = require('./db');

// --- THE FINAL YAHOO FINANCE FIX ---
const yfPackage = require('yahoo-finance2');
const yahooFinance = typeof yfPackage.default === 'function' ? new yfPackage.default() : (yfPackage.default || yfPackage);;

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// --- THE WAR ROOM: LIVE MARKET INTELLIGENCE ROUTE ---
app.get('/api/investments', async (req, res) => {
    try {
        // Fetch trades from Supabase
        const result = await db.query(
            "SELECT * FROM active_investments WHERE user_id = $1 AND status = 'HOLDING'", 
            [1]
        );
        
        const trades = result.rows;

        // 3. The Live Engine: Fetch real prices for each symbol
        const liveTrades = await Promise.all(trades.map(async (trade) => {
            try {
                // If there's a symbol (like BEL.NS), fetch the live quote
                if (trade.asset_symbol) {
                    const quote = await yahooFinance.quote(trade.asset_symbol);
                    return {
                        ...trade,
                        live_price: quote.regularMarketPrice, // Actual market price
                        change_percent: quote.regularMarketChangePercent
                    };
                }
            } catch (yahooErr) {
                console.error(`Quote failed for ${trade.asset_symbol}:`, yahooErr.message);
            }
            // Fallback to entry price if Yahoo fails
            return { ...trade, live_price: trade.entry_price };
        }));

        res.json(liveTrades);
    } catch (err) {
        // THE TRAP IS SET: We removed '.message' here!
        console.error("❌ War Room Intel Error:", err);
        res.status(500).json({ error: "Server Error" });
    }
});

app.get('/', (req, res) => {
  res.send('Legacy Ledger API is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});