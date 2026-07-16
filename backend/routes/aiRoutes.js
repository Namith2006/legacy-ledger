require('dotenv').config();

const express = require('express');
const router = express.Router();
const db = require('../db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

// The Final Yahoo Finance Engine (Initialized for 3.15.3+)
const yfPackage = require('yahoo-finance2');
const yahooFinance = typeof yfPackage.default === 'function' ? new yfPackage.default() : (yfPackage.default || yfPackage);

// Initialize both AI SDKs
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- DUAL-CORE ENGINE: GROQ (PRIMARY) ➡️ GEMINI (SECONDARY) ---
async function generateAIContent(prompt, isJsonResponse = false) {
    
    // Phase 1: Try Groq First (Ultra-fast Primary)
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
        console.error(`❌ Groq primary engine failed: ${groqError.message}`);
        console.log("⚠️ Activating fallback: Shifting request to Google Gemini...");
    }

    // Phase 2: Secondary Fallback to Gemini with retry loops
    const retries = 3;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            if (error.message && error.message.includes('503') && i < retries - 1) {
                console.log(`[Traffic Jam] Gemini fallback is busy. Retrying... (Attempt ${i + 1})`);
                await delay(2000);
            } else {
                console.error(`❌ Gemini fallback failed hard on attempt ${i + 1}: ${error.message}`);
                break;
            }
        }
    }

    throw new Error("Both AI engines are down. Please try again later.");
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

// 3. Stoic Market Research Route (With Timestamp)
router.post('/research', async (req, res) => {
    try {
        let { query, currentBalance } = req.body;
        if (!query) return res.status(400).json({ message: "Please provide a company name or ticker." });

        query = query.trim().toUpperCase();

        let searchResults = await yahooFinance.search(query);
        let validStocks = searchResults.quotes.filter(q => ['EQUITY', 'ETF'].includes(q.quoteType));

        if (validStocks.length === 0 && !query.includes('.')) {
            searchResults = await yahooFinance.search(query + '.NS');
            validStocks = searchResults.quotes.filter(q => ['EQUITY', 'ETF'].includes(q.quoteType));
        }

        if (validStocks.length === 0) {
            return res.status(404).json({ message: `Could not find a valid stock for "${query}".` });
        }
        
        const bestTicker = validStocks[0].symbol;
        const quote = await yahooFinance.quote(bestTicker);
        if (!quote) return res.status(404).json({ message: "Live price data unavailable." });

        const price = quote.regularMarketPrice || quote.previousClose || 0;
        const change = quote.regularMarketChangePercent || 0;
        const companyName = quote.longName || quote.shortName || bestTicker;
        
        const lastUpdated = quote.regularMarketTime || new Date(); 

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
                ticker: bestTicker, 
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

// 4. Robo-Advisor Guided Discovery Route
router.post('/discover', async (req, res) => {
    try {
        const { horizon, risk, sector, budget, goal } = req.body;
        
        const prompt = `
        You are an Indian Stock Market expert. Based on this profile:
        Horizon: ${horizon}, Risk: ${risk}, Sector: ${sector}, Capital: ₹${budget}.
        Primary Goal for this investment: ${goal}.

        Suggest exactly 3 Indian stock tickers (ending in .NS).
        Return ONLY a JSON array of strings, e.g., ["TCS.NS", "INFY.NS", "RELIANCE.NS"].
        `;

        const rawAiText = await generateAIContent(prompt, true);
        const tickers = JSON.parse(rawAiText.replace(/```json/gi, '').replace(/```/gi, '').trim());

        const recommendations = await Promise.all(tickers.map(async (ticker) => {
            const quote = await yahooFinance.quote(ticker);
            const price = quote.regularMarketPrice || quote.previousClose || 1;
            const quantity = Math.floor(budget / price);
            
            return {
                ticker,
                company: quote.longName || quote.shortName || ticker,
                price: price,
                quantity: quantity,
                reason: `Fits a ${risk} profile for your goal: ${goal}.` 
            };
        }));

        res.json({ message: "Discovery Complete", recommendations });
    } catch (err) {
        console.error("Discovery Error:", err.message);
        res.status(500).json({ message: "Failed to build your portfolio." });
    }
});

module.exports = router;