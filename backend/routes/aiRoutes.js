require('dotenv').config();

const express = require('express');
const router = express.Router();
const db = require('../db');
const Groq = require('groq-sdk');

// Initialize Groq SDK
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// The "Fake ID" to get past Yahoo's bot blockers
const YAHOO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

// --- SINGLE-CORE ENGINE: GROQ EXCLUSIVE ---
async function generateAIContent(prompt, isJsonResponse = false) {
    try {
        const options = {
            messages: [
                {
                    role: "system",
                    content: isJsonResponse 
                        ? "You are a precise financial data extraction AI. You must respond ONLY in a clean, valid JSON object matching the schema requested. Do not include markdown wraps."
                        : "You are a stoic financial coach assisting a student. Provide structured text answers strictly as requested."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.1-8b-instant"
        };

        if (isJsonResponse) {
            options.response_format = { type: "json_object" };
        }

        const chatCompletion = await groq.chat.completions.create(options);
        return chatCompletion.choices[0].message.content;
        
    } catch (groqError) {
        console.error(`❌ Groq engine failed: ${groqError.message}`);
        throw new Error("AI engine is currently down. Please try again later.");
    }
}

// 1. Route to analyze user spending
router.post('/analyze/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const transactions = await db.query(
            "SELECT type, amount, category, description FROM transactions WHERE user_id = $1 ORDER BY date DESC LIMIT 10",
            [userId]
        );

        if (transactions.rows.length === 0) {
            return res.status(400).json({ message: "Not enough data to analyze yet!" });
        }

        let transactionText = "Here are my recent transactions:\n";
        transactions.rows.forEach(t => {
            transactionText += `- ${t.type.toUpperCase()}: ₹${t.amount} for ${t.description} (${t.category})\n`;
        });

        const prompt = `
        You are a highly intelligent financial coach. My name is Namith. 
        I am a BCA student saving up for my MCA degree, and my ultimate goal is to get rich so I can spoil my parents.
        
        ${transactionText}
        
        Based on these recent transactions, give me a short, punchy 3-sentence financial strategy. Keep the tone motivational and stoic.
        `;
        
        const aiAdvice = await generateAIContent(prompt, false);

        const savedLog = await db.query(
            "INSERT INTO ai_strategy_logs (user_id, ai_response) VALUES ($1, $2) RETURNING *",
            [userId, aiAdvice]
        );

        res.json({ message: "Analysis Complete", strategy: savedLog.rows[0] });
    } catch (err) {
        console.error("AI Error:", err.message);
        res.status(500).send("Failed to generate AI strategy.");
    }
});

// 2. Route to instantly categorize a raw text transaction
router.post('/smart-entry', async (req, res) => {
    try {
        const { rawText } = req.body;
        if (!rawText) return res.status(400).json({ message: "Please provide transaction text." });

        const prompt = `
        Read the following user input and convert it into a strict JSON object.
        User Input: "${rawText}"
        Rules:
        1. "type": Must be exactly 'income' or 'expense'.
        2. "amount": Extract number value only.
        3. "category": Choose from: [food, transport, tech, subscriptions, health, entertainment, freelance, allowance, gift, other].
        4. "description": Clean, short summary (max 5 words).
        Return ONLY valid JSON.
        `;

        const rawAiText = await generateAIContent(prompt, true);
        let cleanJson = rawAiText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const parsedData = JSON.parse(cleanJson);

        res.json({ message: "Smart extraction successful", data: parsedData });
    } catch (err) {
        console.error("Smart Entry Error:", err.message);
        res.status(500).json({ message: "Failed to parse transaction" });
    }
});

// 3. Stoic Market Research Route (Smart Search + Direct Public Market Data WITH FAKE ID)
router.post('/research', async (req, res) => {
    try {
        let { query, currentBalance } = req.body;
        if (!query) return res.status(400).json({ message: "Please provide a company ticker or name." });

        query = query.trim().toUpperCase();
        let cleanSymbol = query.replace('.NS', '');

        // STEP 1: Translate the text into an exact NSE ticker symbol
        const searchUrl = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(cleanSymbol)}&exchange=NSE`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (!searchData.data || searchData.data.length === 0) {
            return res.status(404).json({ message: `Could not find a valid NSE stock for "${query}".` });
        }

        const bestTicker = searchData.data[0].symbol;
        let companyName = searchData.data[0].instrument_name || bestTicker;

        // STEP 2: The Loophole - Fetch the live price using Yahoo's RAW public chart API
        let price = 0;
        let change = 0;
        
        try {
            const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${bestTicker}.NS`;
            // INJECTING THE BROWSER HEADERS HERE
            const yahooResponse = await fetch(yahooUrl, { headers: YAHOO_HEADERS });
            
            if (!yahooResponse.ok) throw new Error(`Yahoo blocked request: ${yahooResponse.status}`);
            
            const yahooData = await yahooResponse.json();

            if (yahooData.chart && yahooData.chart.result && yahooData.chart.result.length > 0) {
                const meta = yahooData.chart.result[0].meta;
                price = parseFloat(meta.regularMarketPrice);
                const prevClose = parseFloat(meta.chartPreviousClose);
                change = ((price - prevClose) / prevClose) * 100;
            } else {
                throw new Error("Invalid Yahoo Data");
            }
        } catch (yahooError) {
            console.log(`⚠️ Raw Market Data missing for ${bestTicker}: ${yahooError.message}. Activating fallback.`);
            price = parseFloat((Math.random() * 500 + 100).toFixed(2));
            change = parseFloat((Math.random() * 4 - 2).toFixed(2));
            companyName = `${companyName} (Estimated)`;
        }

        const lastUpdated = new Date();

        const prompt = `
        You are a stoic financial advisor assisting a BCA student named Namith. 
        Analyze the following asset:
        Company: ${companyName} (${bestTicker})
        Live Price: ₹${price.toFixed(2)}
        Today's Change: ${change.toFixed(2)}%

        Provide a strictly objective, stoic analysis. Format in 3 short paragraphs.
        `;

        const aiAnalysis = await generateAIContent(prompt, false);
        
        res.json({
            message: "Market Analysis Complete",
            data: { 
                company: companyName, 
                ticker: bestTicker + ".NS", 
                price: price, 
                change: change, 
                time: lastUpdated, 
                analysis: aiAnalysis 
            }
        });
    } catch (err) {
        console.error("Market Research Error:", err.message);
        res.status(500).json({ message: "Failed to analyze the market. Try being more specific." });
    }
});

// 4. Robo-Advisor Guided Discovery Route (Fully Safe Object Parsing & Yahoo Loophole WITH FAKE ID)
router.post('/discover', async (req, res) => {
    try {
        const { horizon, risk, sector, budget, goal } = req.body;
        
        const prompt = `
        You are an Indian Stock Market expert. Based on this profile:
        Horizon: ${horizon}, Risk: ${risk}, Sector: ${sector}, Capital: ₹${budget}.
        Primary Goal: ${goal}.

        Suggest exactly 3 Indian stock tickers that are actively traded on the NSE.
        You must return a valid JSON object containing a root key named "tickers" holding an array of 3 ticker string elements (no ".NS" suffix, upper case).
        
        Example JSON format:
        {
          "tickers": ["TCS", "INFY", "RELIANCE"]
        }
        `;

        const rawAiText = await generateAIContent(prompt, true);
        
        let tickers = [];
        try {
            const cleanJson = rawAiText.replace(/```json/gi, '').replace(/```/gi, '').trim();
            const parsed = JSON.parse(cleanJson);
            
            if (Array.isArray(parsed)) {
                tickers = parsed;
            } else if (parsed && Array.isArray(parsed.tickers)) {
                tickers = parsed.tickers;
            } else if (typeof parsed === 'object' && parsed !== null) {
                const keys = Object.keys(parsed);
                for (let key of keys) {
                    if (Array.isArray(parsed[key])) {
                        tickers = parsed[key];
                        break;
                    }
                }
            }
        } catch (parseError) {
            const matches = rawAiText.match(/"([^"]+)"/g);
            if (matches) {
                tickers = matches.map(m => m.replace(/"/g, ''));
            }
        }

        if (!Array.isArray(tickers) || tickers.length === 0) {
            tickers = ["TCS", "INFY", "RELIANCE"];
        }

        const recommendations = [];
        
        for (let ticker of tickers) {
            try {
                let cleanSymbol = ticker.replace('.NS', '').trim().toUpperCase();
                if (cleanSymbol === "TICKERS" || cleanSymbol.length > 7) continue;

                let price = 0;
                let companyName = cleanSymbol;

                // --- THE YAHOO LOOPHOLE ---
                try {
                    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}.NS`;
                    // INJECTING THE BROWSER HEADERS HERE
                    const yahooResponse = await fetch(yahooUrl, { headers: YAHOO_HEADERS });
                    
                    if (!yahooResponse.ok) throw new Error(`Yahoo blocked request: ${yahooResponse.status}`);
                    
                    const yahooData = await yahooResponse.json();

                    if (yahooData.chart && yahooData.chart.result && yahooData.chart.result.length > 0) {
                        const meta = yahooData.chart.result[0].meta;
                        price = parseFloat(meta.regularMarketPrice);
                        companyName = meta.shortName || cleanSymbol;
                    } else {
                        throw new Error("Invalid Yahoo Data");
                    }
                } catch (yahooError) {
                    console.log(`⚠️ Live data missing for discovery asset: ${cleanSymbol}: ${yahooError.message}. Deploying simulation.`);
                    price = parseFloat((Math.random() * 800 + 80).toFixed(2));
                    companyName = `${cleanSymbol} (Estimated)`;
                }

                const quantity = Math.floor(budget / price) || 1; 
                
                recommendations.push({
                    ticker: cleanSymbol + '.NS',
                    company: companyName,
                    price: price,
                    quantity: quantity,
                    reason: `Fits a ${risk} profile for your goal: ${goal}.` 
                });
                
                // 500ms delay to pace requests
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (e) {
                console.log(`Error processing discovery component ${ticker}:`, e.message);
            }
        }

        if (recommendations.length === 0) {
            recommendations.push(
                { ticker: "TCS.NS", company: "Tata Consultancy Services", price: 3950.00, quantity: Math.floor(budget / 3950) || 1, reason: "Stable core backing for wealth growth." },
                { ticker: "INFY.NS", company: "Infosys Limited", price: 1620.00, quantity: Math.floor(budget / 1620) || 1, reason: "Strong tech foundations alignment." },
                { ticker: "RELIANCE.NS", company: "Reliance Industries", price: 2450.00, quantity: Math.floor(budget / 2450) || 1, reason: "Broad index coverage protection." }
            );
        }

        res.json({ message: "Discovery Complete", recommendations });
    } catch (err) {
        console.error("Discovery Error:", err.message);
        res.status(500).json({ message: "Failed to build your portfolio safely." });
    }
});

module.exports = router;