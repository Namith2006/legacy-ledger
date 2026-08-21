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

// 2. Route to instantly categorize a transaction (Dynamic Variable Math Engine)
router.post('/smart-entry', async (req, res) => {
    try {
        const { rawText } = req.body;
        if (!rawText) return res.status(400).json({ message: "Please provide transaction text." });

        const prompt = `
        Read the following user input and convert it into a strict, clean JSON object.
        User Input: "${rawText}"
        
        Rules:
        1. "type": Must be exactly 'income' or 'expense'. 
           - Selling an asset (gold, stock, crypto) brings cash in -> 'income'.
           - Buying an asset takes cash out -> 'expense'.
        2. "amount": Extract the actual total cash transaction value only.
        3. "category": Choose from: [food, transport, tech, subscriptions, health, entertainment, freelance, allowance, gift, investments, other].
        4. "description": Clean summary. 

        DYNAMIC PROFIT MATH RULES:
        - Strictly extract the numbers directly from the User Input text. Never reuse default or previous numbers.
        - Let Total Sale Amount = A, Buy Rate = B, Sell Rate = S.
        - If B and S are provided:
          1. Calculate Cost Basis = A * (B / S)
          2. Calculate Profit = A - Cost Basis
        - Format the description string strictly using these extracted values:
          "Sold Asset (Profit: +₹[Calculated Profit] | Buy: [B], Sell: [S])"
        
        Return ONLY valid JSON. Do not include markdown wraps or backticks.
        `;

        const rawAiText = await generateAIContent(prompt, true);
        
        // --- IMPROVEMENT 1: ROBUST PARSING & FALLBACK ---
        const clean = rawAiText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        let parsedData;
        
        try {
            parsedData = JSON.parse(clean);
        } catch (e) {
            // Fallback: attempt to extract JSON-like substring
            const jsonMatch = clean.match(/(\{[\s\S]*\})/m);
            if (jsonMatch) {
                try {
                    parsedData = JSON.parse(jsonMatch[0]);
                } catch (nestedErr) {
                    return res.status(422).json({ error: 'AI returned invalid JSON format', rawOutput: rawAiText });
                }
            } else {
                return res.status(422).json({ error: 'AI returned invalid JSON format', rawOutput: rawAiText });
            }
        }

        // Validate shape manually
        if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
            return res.status(422).json({ error: 'Parsed output invalid shape', rawOutput: rawAiText });
        }

        res.json({ message: "Smart extraction successful", data: parsedData });
    } catch (err) {
        console.error("Smart Entry Error:", err.message);
        res.status(500).json({ message: "Failed to parse transaction" });
    }
});

// 3. Stoic Market Research Route 
router.post('/research', async (req, res) => {
    try {
        let { query, currentBalance } = req.body;
        if (!query) return res.status(400).json({ message: "Please provide a company ticker or name." });

        query = query.trim().toUpperCase();
        let cleanSymbol = query.replace('.NS', '');

        const searchUrl = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(cleanSymbol)}&exchange=NSE`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (!searchData.data || searchData.data.length === 0) {
            return res.status(404).json({ message: `Could not find a valid NSE stock for "${query}".` });
        }

        const bestTicker = searchData.data[0].symbol;
        let companyName = searchData.data[0].instrument_name || bestTicker;

        let price = 0;
        let change = 0;
        
        try {
            const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${bestTicker}.NS`;
            const yahooResponse = await fetch(yahooUrl, { headers: YAHOO_HEADERS });
            
            if (!yahooResponse.ok) throw new Error(`Yahoo blocked request`);
            
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
            console.log(`⚠️ Raw Market Data missing for ${bestTicker}. Activating fallback.`);
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

// 4. Robo-Advisor Guided Discovery Route (Strict NSE Lock)
router.post('/discover', async (req, res) => {
    try {
        const { horizon, risk, sector, budget, goal } = req.body;
        
        const prompt = `
        You are an Indian Stock Market expert. Based on this profile:
        Horizon: ${horizon}, Risk: ${risk}, Sector: ${sector}, Capital: ₹${budget}.
        Primary Goal: ${goal}.

        Suggest 4 to 5 high-quality Indian stock tickers that are actively traded on the NSE.
        Use actual, official NSE tickers (e.g., HDFCBANK, TCS, INFY, SBIN). Do not invent tickers.
        You must return a valid JSON object containing a root key named "tickers" holding an array of ticker string elements (no ".NS" suffix, upper case).
        
        Example JSON format:
        {
          "tickers": ["TCS", "INFY", "RELIANCE", "SBIN"]
        }
        `;

        const rawAiText = await generateAIContent(prompt, true);
        
        // --- IMPROVEMENT 2: ROBUST PARSING & FALLBACK FOR ARRAYS ---
        const clean = rawAiText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        let parsed;
        
        try {
            parsed = JSON.parse(clean);
        } catch (e) {
            // Fallback: attempt to extract JSON-like substring (object or array)
            const jsonMatch = clean.match(/(\{[\s\S]*\})|(\[[\s\S]*\])/m);
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                } catch (nestedErr) {
                    return res.status(422).json({ error: 'AI returned invalid JSON format', rawOutput: rawAiText });
                }
            } else {
                // Secondary fallback if it just lists strings in quotes
                const matches = rawAiText.match(/"([^"]+)"/g);
                if (matches) {
                    parsed = matches.map(m => m.replace(/"/g, ''));
                } else {
                    return res.status(422).json({ error: 'AI returned invalid JSON format', rawOutput: rawAiText });
                }
            }
        }

        // Validate shape manually
        if (!parsed || typeof parsed !== 'object') {
            return res.status(422).json({ error: 'Parsed output invalid shape', rawOutput: rawAiText });
        }

        let tickers = [];
        
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

        if (!Array.isArray(tickers) || tickers.length === 0) {
            tickers = ["TCS", "INFY", "RELIANCE"];
        }

        const recommendations = [];
        
        for (let ticker of tickers) {
            try {
                if (recommendations.length === 3) break;

                let cleanSymbol = ticker.replace('.NS', '').trim().toUpperCase();
                if (cleanSymbol === "TICKERS" || cleanSymbol.length > 7) continue;

                let price = 0;
                let companyName = cleanSymbol;
                let finalTicker = cleanSymbol + ".NS";
                let fetchSuccess = false;

                // --- STEP 1: DIRECT YAHOO FETCH (Forces the .NS extension immediately) ---
                try {
                    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${finalTicker}`;
                    const yahooResponse = await fetch(yahooUrl, { headers: YAHOO_HEADERS });
                    
                    if (yahooResponse.ok) {
                        const yahooData = await yahooResponse.json();
                        if (yahooData.chart && yahooData.chart.result && yahooData.chart.result.length > 0) {
                            const meta = yahooData.chart.result[0].meta;
                            price = parseFloat(meta.regularMarketPrice);
                            companyName = meta.shortName || cleanSymbol;
                            fetchSuccess = true;
                        }
                    }
                } catch (e) {
                    console.log(`Direct fetch missed for ${finalTicker}`);
                }

                // --- STEP 2: YAHOO AUTOCORRECT TRANSLATOR (Strictly locked to .NS results) ---
                if (!fetchSuccess) {
                    try {
                        const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanSymbol)}&quotesCount=5&newsCount=0`;
                        const searchResponse = await fetch(searchUrl, { headers: YAHOO_HEADERS });
                        const searchData = await searchResponse.json();
                        
                        // CRUCIAL: Find the first result that actually belongs to the Indian exchange
                        const bestMatch = searchData.quotes && searchData.quotes.find(q => q.symbol.endsWith('.NS'));
                        
                        if (bestMatch) {
                            finalTicker = bestMatch.symbol; 
                            
                            // Try the fetch one more time with the corrected Indian ticker
                            const fallbackUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${finalTicker}`;
                            const fallbackResponse = await fetch(fallbackUrl, { headers: YAHOO_HEADERS });
                            const fallbackData = await fallbackResponse.json();

                            if (fallbackData.chart && fallbackData.chart.result && fallbackData.chart.result.length > 0) {
                                const meta = fallbackData.chart.result[0].meta;
                                price = parseFloat(meta.regularMarketPrice);
                                companyName = meta.shortName || bestMatch.shortname || cleanSymbol;
                                fetchSuccess = true;
                            }
                        }
                    } catch (searchErr) {
                        console.log(`Translator failed for ${cleanSymbol}`);
                    }
                }

                // --- STEP 3: FINAL FALLBACK ---
                if (!fetchSuccess) {
                    console.log(`⚠️ Live data missing for discovery asset: ${cleanSymbol}. Deploying simulation.`);
                    price = parseFloat((Math.random() * 800 + 80).toFixed(2));
                    companyName = `${companyName} (Estimated)`;
                    finalTicker = cleanSymbol + ".NS"; // Reset to .NS for UI consistency
                }

                const quantity = Math.floor(budget / price) || 1; 
                
                recommendations.push({
                    ticker: finalTicker,
                    company: companyName,
                    price: price,
                    quantity: quantity,
                    reason: `Fits a ${risk} profile for your goal: ${goal}.` 
                });
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (e) {
                console.log(`Error processing discovery component ${ticker}:`, e.message);
            }
        }

        // --- DYNAMIC BACKFILLING POOL ---
        if (recommendations.length < 3) {
            const backupPool = [
                { ticker: "TCS.NS", company: "Tata Consultancy Services", price: 3950.00, reason: "Stable tech foundations alignment." },
                { ticker: "RELIANCE.NS", company: "Reliance Industries Limited", price: 2450.00, reason: "Broad index energy coverage protection." },
                { ticker: "HDFCBANK.NS", company: "HDFC Bank Limited", price: 1650.00, reason: "Core banking sector heavyweight security." },
                { ticker: "INFY.NS", company: "Infosys Limited", price: 1620.00, reason: "Stable core backing for wealth growth." }
            ];

            for (let backup of backupPool) {
                if (recommendations.length >= 3) break; 

                const isDuplicate = recommendations.some(r => r.ticker === backup.ticker);
                if (!isDuplicate) {
                    const quantity = Math.floor(budget / backup.price) || 1;
                    recommendations.push({
                        ticker: backup.ticker,
                        company: backup.company,
                        price: backup.price,
                        quantity: quantity,
                        reason: `${backup.reason} (Fallback Allocation for ${goal})`
                    });
                }
            }
        }

        const finalPortfolio = recommendations.slice(0, 3);

        res.json({ message: "Discovery Complete", recommendations: finalPortfolio });
    } catch (err) {
        console.error("Discovery Error:", err.message);
        res.status(500).json({ message: "Failed to build your portfolio safely." });
    }
});

module.exports = router;