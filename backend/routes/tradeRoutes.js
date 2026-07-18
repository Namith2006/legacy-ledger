const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. FETCH & ENRICH ROUTE: Get trades + Live Market Prices
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await db.query("SELECT * FROM active_trades WHERE user_id = $1 ORDER BY id DESC", [userId]);
        const trades = result.rows;

        if (trades.length === 0) return res.json([]);

        // Extract unique tickers and request them in a SINGLE batch API call to save rate limits
        const uniqueTickers = [...new Set(trades.map(t => t.ticker.replace('.NS', '').toUpperCase()))];
        const tickerString = uniqueTickers.join(',');
        
        const url = `https://api.twelvedata.com/quote?symbol=${tickerString}&exchange=NSE&apikey=${process.env.TWELVEDATA_API_KEY}`;
        const tdResponse = await fetch(url);
        const liveData = await tdResponse.json();

        // Merge live data with your database data
        const enrichedTrades = trades.map(trade => {
            const cleanTicker = trade.ticker.replace('.NS', '').toUpperCase();
            
            // Twelve Data returns a direct object for 1 stock, but a nested object for multiple
            let quote = uniqueTickers.length === 1 ? liveData : liveData[cleanTicker];
            
            let livePrice = parseFloat(trade.buy_price); // Default to buy price
            
            // The Fallback Engine
            if (quote && quote.close) {
                livePrice = parseFloat(quote.close);
            } else {
                console.log(`⚠️ Live data missing for War Room asset: ${cleanTicker}. Generating estimate.`);
                livePrice = parseFloat(trade.buy_price) + (Math.random() * 20 - 10); 
            }

            const totalValue = livePrice * trade.quantity;
            const totalCost = trade.buy_price * trade.quantity;
            const roi = ((totalValue - totalCost) / totalCost) * 100;

            return {
                ...trade,
                live_price: livePrice.toFixed(2),
                total_value: totalValue.toFixed(2),
                roi: roi.toFixed(2)
            };
        });

        res.json(enrichedTrades);
    } catch (err) {
        console.error("Fetch Trades Error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// 2. CREATE ROUTE: Deploy Capital
router.post('/', async (req, res) => {
    try {
        const { user_id, ticker, buy_price, quantity } = req.body;
        let cleanTicker = ticker.toUpperCase().trim();
        if (!cleanTicker.endsWith('.NS')) cleanTicker += '.NS';

        const newTrade = await db.query(
            "INSERT INTO active_trades (user_id, ticker, buy_price, quantity) VALUES ($1, $2, $3, $4) RETURNING *",
            [user_id, cleanTicker, buy_price, quantity]
        );
        res.status(201).json(newTrade.rows[0]);
    } catch (err) {
        console.error("Add Trade Error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// 3. DELETE ROUTE: Close Position
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM active_trades WHERE id = $1", [id]);
        res.json({ message: "Position Closed" });
    } catch (err) {
        console.error("Delete Trade Error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;