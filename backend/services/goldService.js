const axios = require('axios');
const cheerio = require('cheerio');

// In-memory cache to avoid excessive external requests
let cachedGoldPrice = 15458; // Default fallback to current 24K rate
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

async function getLiveIndianGoldPrice() {
    const now = Date.now();
    if (now - lastFetchTime < CACHE_DURATION) {
        return cachedGoldPrice;
    }

    try {
        // Scrape live domestic retail rates from GoodReturns
        const response = await axios.get('https://www.goodreturns.in/gold-rates/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000
        });

        const $ = cheerio.load(response.data);

        // GoodReturns lists the 24K 1-gram price in standard price tables
        let extractedPrice = null;

        $('table tr').each((_, row) => {
            const rowText = $(row).text();
            if (rowText.includes('24K') && (rowText.includes('1 Gram') || rowText.includes('1g'))) {
                const cols = $(row).find('td');
                const rawPrice = $(cols[1]).text().replace(/[^\d.]/g, '');
                if (rawPrice) {
                    extractedPrice = parseFloat(rawPrice);
                }
            }
        });

        if (extractedPrice && !isNaN(extractedPrice)) {
            cachedGoldPrice = extractedPrice;
            lastFetchTime = now;
        }

        return cachedGoldPrice;
    } catch (error) {
        console.error('Failed to fetch live Indian gold rate, falling back to cached value:', error.message);
        return cachedGoldPrice;
    }
}

module.exports = { getLiveIndianGoldPrice };