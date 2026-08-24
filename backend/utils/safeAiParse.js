function safeAiParse(aiOutput, fallback = null) {
    if (!aiOutput || typeof aiOutput !== 'string') {
        return fallback;
    }

    try {
        // Strip markdown code fences if present
        let cleaned = aiOutput.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        }

        return JSON.parse(cleaned);
    } catch (error) {
        console.error('❌ safeAiParse failed to parse JSON output:', error.message);
        return fallback;
    }
}

module.exports = safeAiParse;