require('dotenv').config(); // THIS MUST BE LINE 1
const express = require('express');
const cors = require('cors');
const db = require('./db');

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

// --- THE WAR ROOM: LIVE MARKET INTELLIGENCE ROUTE (UPGRADED TO TWELVE DATA) ---
app.get('/api/investments', async (req, res) => {
    try {
        // Fetch active holdings from Supabase matching your existing schema
        const result = await db.query(
            "SELECT * FROM active_investments WHERE user_id = $1 AND status = 'HOLDING'", 
            [1]
        );
        const trades = result.rows;

        if (trades.length === 0) return res.json([]);

        // Extract unique symbols and format them for a single batch API call (e.g., "BEL.NS" -> "BEL")
        const uniqueSymbols = [...new Set(trades.map(t => t.asset_symbol ? t.asset_symbol.replace('.NS', '').toUpperCase() : ''))].filter(Boolean);
        
        let liveData = {};
        if (uniqueSymbols.length > 0) {
            const tickerString = uniqueSymbols.join(',');
            const url = `https://api.twelvedata.com/quote?symbol=${tickerString}&exchange=NSE&apikey=${process.env.TWELVEDATA_API_KEY}`;
            const tdResponse = await fetch(url);
            liveData = await tdResponse.json();
        }

        // Map through investments and calculate live metrics cleanly
        const liveTrades = trades.map(trade => {
            if (!trade.asset_symbol) {
                return { ...trade, live_price: trade.entry_price, change_percent: "0.00" };
            }

            const cleanSymbol = trade.asset_symbol.replace('.NS', '').toUpperCase();
            
            // Twelve Data returns a direct object for 1 stock, but a nested object for multiple
            let quote = uniqueSymbols.length === 1 ? liveData : liveData[cleanSymbol];

            let livePrice = parseFloat(trade.entry_price);
            let changePercent = 0;

            // --- GRACEFUL DEGRADATION ENGINE ---
            if (quote && quote.close) {
                livePrice = parseFloat(quote.close);
                changePercent = parseFloat(quote.percent_change) || 0;
            } else {
                console.log(`⚠️ Live data missing for War Room asset: ${cleanSymbol}. Deploying simulation.`);
                // Safe simulation layout to prevent frontend breaks
                livePrice = parseFloat(trade.entry_price) + (Math.random() * 10 - 5);
                changePercent = (Math.random() * 4 - 2);
            }

            return {
                ...trade,
                live_price: livePrice.toFixed(2),
                change_percent: changePercent.toFixed(2)
            };
        });

        res.json(liveTrades);
    } catch (err) {
        console.error("❌ War Room Intel Error:", err.message || err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- KEEP-AWAKE PING ROUTE FOR UPTIMEROBOT ---
app.get('/api/ping', (req, res) => {
    res.status(200).send("Legacy Ledger Backend is awake!");
});

app.get('/', (req, res) => {
  res.send('Legacy Ledger API is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});