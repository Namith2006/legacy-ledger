require('dotenv').config();

const express = require('express');
const router = express.Router();
const db = require('../db');
const Groq = require('groq-sdk');

// Initialize Groq SDK
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- SINGLE-CORE ENGINE: GROQ EXCLUSIVE ---
async function generateAIContent(prompt, isJsonResponse = false) {
    try {
        const options = {
            messages: [
                {
                    role: "system",
                    content: isJsonResponse 
                        ? "You are a precise financial data extraction AI. You must respond ONLY in a clean, valid JSON object or array matching the schema requested. Do not include markdown wraps."
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

// 3. Stoic Market Research Route (Using Twelve Data API with Smart Search)
router.post('/research', async (req, res) => {
    try {
        let { query, currentBalance } = req.body;
        if (!query) return res.status(400).json({ message: "Please provide a company ticker or name." });

        query = query.trim().toUpperCase();
        let cleanSymbol = query.replace('.NS', '');

        // STEP 1: Translate the user's text into an exact NSE ticker symbol
        const searchUrl = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(cleanSymbol)}&exchange=NSE`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        // If the search returns empty, the company isn't on the NSE
        if (!searchData.data || searchData.data.length === 0) {
            return res.status(404).json({ message: `Could not find a valid NSE stock for "${query}".` });
        }

        // Grab the closest matching ticker (e.g., "BEL")
        const bestTicker = searchData.data[0].symbol;

        // STEP 2: Fetch the live quote using the exact ticker
        const url = `https://api.twelvedata.com/quote?symbol=${bestTicker}&exchange=NSE&apikey=${process.env.TWELVEDATA_API_KEY}`;
        const tdResponse = await fetch(url);
        const data = await tdResponse.json();

        if (data.status === 'error' || !data.close) {
            return res.status(404).json({ message: `Live data currently unavailable for ${bestTicker}.` });
        }
        
        const price = parseFloat(data.close);
        const change = parseFloat(data.percent_change);
        const companyName = data.name;
        
        const lastUpdated = new Date(); 

        const prompt = `
        You are a stoic financial advisor assisting a BCA student named Namith. 
        Analyze the following asset:
        Company: ${companyName} (${bestTicker})
        Live Price: ₹${price}
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

// 4. Robo-Advisor Guided Discovery Route (Optimized for 8 req/min Rate Limits)
router.post('/discover', async (req, res) => {
    try {
        const { horizon, risk, sector, budget, goal } = req.body;
        
        const prompt = `
        You are an Indian Stock Market expert. Based on this profile:
        Horizon: ${horizon}, Risk: ${risk}, Sector: ${sector}, Capital: ₹${budget}.
        Primary Goal: ${goal}.

        Suggest exactly 3 Indian stock tickers that are actively traded on the NSE.
        Provide ONLY the raw ticker symbol (no ".NS" at the end, no company names).
        Return ONLY a valid JSON array of strings.
        Example format: ["TCS", "INFY", "RELIANCE"]
        `;

        const rawAiText = await generateAIContent(prompt, true);
        const tickers = JSON.parse(rawAiText.replace(/```json/gi, '').replace(/```/gi, '').trim());

        const recommendations = [];
        const apiKey = process.env.TWELVEDATA_DISCOVERY_KEY || process.env.TWELVEDATA_API_KEY;
        
        for (let ticker of tickers) {
            try {
                // Clean the symbol just in case the AI added extra text
                let cleanSymbol = ticker.replace('.NS', '').trim().toUpperCase();
                
                // Directly fetch quote, completely skipping the search step to save API credits
                const quoteUrl = `https://api.twelvedata.com/quote?symbol=${cleanSymbol}&exchange=NSE&apikey=${apiKey}`;
                const quoteResponse = await fetch(quoteUrl);
                const quote = await quoteResponse.json();
                
                if (quote.status === 'error' || !quote.close) {
                    console.log(`TwelveData skipped ${cleanSymbol}:`, quote.message);
                    continue; 
                }

                const price = parseFloat(quote.close);
                const quantity = Math.floor(budget / price);
                
                recommendations.push({
                    ticker: cleanSymbol + '.NS',
                    company: quote.name || cleanSymbol,
                    price: price,
                    quantity: quantity,
                    reason: `Fits a ${risk} profile for your goal: ${goal}.` 
                });
                
                // Tiny 800ms delay to pace the requests and avoid triggering spam filters
                await new Promise(resolve => setTimeout(resolve, 800));
                
            } catch (e) {
                console.log(`Failed to fetch data for ${ticker}:`, e.message);
            }
        }

        if (recommendations.length === 0) {
             // Return a 400 with a clear message instead of crashing the server with a 500
             return res.status(400).json({ message: "Market data limit reached. Please wait 60 seconds and try again." });
        }

        res.json({ message: "Discovery Complete", recommendations });
    } catch (err) {
        console.error("Discovery Error:", err.message);
        res.status(500).json({ message: "Failed to build your portfolio." });
    }
});

module.exports = router;