require('dotenv').config(); // THIS MUST BE LINE 1!

const express = require('express');
const router = express.Router();
const db = require('../db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// The Final Yahoo Finance Engine (Fixed Import)
const yfPackage = require('yahoo-finance2');
const yahooFinance = typeof yfPackage.default === 'function' ? new yfPackage.default() : (yfPackage.default || yfPackage);

// Initialize the AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- THE TRAFFIC JAM BUSTER ---
// This function waits silently, then tries knocking on Google's door again.
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(prompt, retries = 3) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text(); // If it succeeds, return the text immediately!
        } catch (error) {
            // If we get a 503 traffic jam, and we haven't run out of tries...
            if (error.message && error.message.includes('503') && i < retries - 1) {
                console.log(`[Traffic Jam] Gemini is busy. Retrying in 2 seconds... (Attempt ${i + 1} of ${retries})`);
                await delay(2000); // Pause for 2 seconds, then loop repeats
            } else {
                throw error; // If it's a real error, crash normally
            }
        }
    }
}
// ------------------------------


// 1. Route to analyze user spending and generate a strategy
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
        
        Based on these recent transactions, give me a short, punchy 3-sentence financial strategy. Tell me what I am doing well, and where I can cut back to reach my goals faster. Keep the tone motivational and stoic.
        `;

        // USING THE NEW TRAFFIC JAM BUSTER! (Temporarily Disabled for Quota)
        // const aiAdvice = await callGeminiWithRetry(prompt);
        
        // --- TEMPORARY MOCK DATA ---
        const aiAdvice = "Mock Strategy: You are doing well saving for your MCA, but keep an eye on discretionary spending. Stay disciplined. Do not let short-term desires delay the ultimate goal of supporting your family.";

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
        You are a precise financial data extraction AI. 
        Read the following user input and convert it into a strict JSON object.
        User Input: "${rawText}"
        Rules:
        1. "type": Must be exactly 'income' or 'expense'.
        2. "amount": Extract number value only.
        3. "category": Choose from: [food, transport, tech, subscriptions, health, entertainment, freelance, allowance, gift, other].
        4. "description": Clean, short summary (max 5 words).
        Return ONLY valid JSON.
        `;

        // USING THE NEW TRAFFIC JAM BUSTER! (Temporarily Disabled for Quota)
        // const rawAiText = await callGeminiWithRetry(prompt);
        
        // --- TEMPORARY MOCK DATA ---
        const rawAiText = `{"type": "expense", "amount": 999, "category": "tech", "description": "Mock Data Entry"}`;

        let cleanJson = rawAiText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const parsedData = JSON.parse(cleanJson);

        res.json({ message: "Smart extraction successful", data: parsedData });
    } catch (err) {
        console.error("Smart Entry Error:", err.message);
        res.status(500).json({ message: "Failed to parse transaction" });
    }
});

// 3. Stoic Market Research Route (Bulletproof Edition!)
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
            return res.status(404).json({ message: `Could not find a valid stock for "${query}". Check your spelling.` });
        }
        
        const bestTicker = validStocks[0].symbol;
        const quote = await yahooFinance.quote(bestTicker);
        if (!quote) return res.status(404).json({ message: "Live price data unavailable." });

        const price = quote.regularMarketPrice;
        const change = quote.regularMarketChangePercent;
        const companyName = quote.longName || quote.shortName;

        const prompt = `
        You are a stoic financial advisor assisting a BCA student named Namith. 
        Namith currently has ₹${currentBalance || 0} in his savings. He is saving for his MCA degree and to ultimately spoil his parents.
        
        Analyze the following asset:
        Company: ${companyName} (${bestTicker})
        Live Price: ₹${price}
        Today's Change: ${change.toFixed(2)}%

        Provide a strictly objective, stoic analysis. 
        1. Briefly explain what this company does.
        2. Assess the risk level based on standard market principles.
        3. Give a stoic warning about the psychology of investing in this right now, keeping his MCA and family goals in mind.
        Do NOT tell him to buy or sell. Format it in 3 short, readable paragraphs.
        `;

        // USING THE NEW TRAFFIC JAM BUSTER! (Temporarily Disabled for Quota)
        // const aiAnalysis = await callGeminiWithRetry(prompt);

        // --- TEMPORARY MOCK DATA ---
        const aiAnalysis = "Mock Analysis: This company operates in a major sector of the Indian economy and shows consistent volume.\n\nInvesting in single equities always carries inherent volatility and standard market risks apply.\n\nRemember your stoic principles: do not let daily price fluctuations distract you from your MCA fund. Stay the course.";
        
        res.json({
            message: "Market Analysis Complete",
            data: { company: companyName, ticker: bestTicker, price: price, change: change, analysis: aiAnalysis }
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

        Suggest exactly 3 Indian stock tickers (ending in .NS) that align perfectly with this specific goal and risk profile.
        Return ONLY a JSON array of strings, e.g., ["TCS.NS", "INFY.NS", "RELIANCE.NS"].
        `;

        // USING THE NEW TRAFFIC JAM BUSTER! (Temporarily Disabled for Quota)
        // const rawAiText = await callGeminiWithRetry(prompt);

        // --- TEMPORARY MOCK DATA ---
        const rawAiText = `["RELIANCE.NS", "TCS.NS", "INFY.NS"]`;

        const tickers = JSON.parse(rawAiText.replace(/```json/gi, '').replace(/```/gi, '').trim());

        const recommendations = await Promise.all(tickers.map(async (ticker) => {
            const quote = await yahooFinance.quote(ticker);
            const price = quote.regularMarketPrice;
            const quantity = Math.floor(budget / price);
            
            return {
                ticker,
                company: quote.longName || quote.shortName,
                price: price,
                quantity: quantity,
                reason: `Fits a ${risk} profile to help achieve your goal: ${goal}.` 
            };
        }));

        res.json({ message: "Discovery Complete", recommendations });

    } catch (err) {
        console.error("Discovery Error:", err.message);
        res.status(500).json({ message: "Failed to build your portfolio." });
    }
});

module.exports = router;