const { z } = require('zod');

/**
 * Safely parses raw LLM output and validates it against a Zod schema.
 * @param {string} rawAiText - Raw text returned from the AI model.
 * @param {z.ZodSchema} schema - Zod schema to validate against.
 * @param {any} fallback - Optional fallback value if parsing or validation fails.
 */
function safeParseWithSchema(rawAiText, schema, fallback = null) {
    if (!rawAiText || typeof rawAiText !== 'string') {
        return { success: false, error: 'Empty or invalid AI output', data: fallback, rawOutput: rawAiText };
    }

    // 1. Strip markdown code fences (e.g. ```json ... ```)
    let cleaned = rawAiText.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    // 2. Attempt direct JSON parse
    let parsedJson;
    try {
        parsedJson = JSON.parse(cleaned);
    } catch (err) {
        // Fallback: Attempt regex substring extraction for { ... } or [ ... ]
        const match = cleaned.match(/(\{[\s\S]*\})|(\[[\s\S]*\])/m);
        if (match) {
            try {
                parsedJson = JSON.parse(match[0]);
            } catch (nestedErr) {
                return { success: false, error: 'Failed to extract valid JSON', rawOutput: rawAiText, data: fallback };
            }
        } else {
            return { success: false, error: 'Invalid JSON format', rawOutput: rawAiText, data: fallback };
        }
    }

    // 3. Validate against Zod schema if provided
    if (schema) {
        const validation = schema.safeParse(parsedJson);
        if (!validation.success) {
            return {
                success: false,
                error: 'AI output failed schema validation',
                details: validation.error.issues,
                rawOutput: rawAiText,
                data: fallback
            };
        }
        return { success: true, data: validation.data };
    }

    return { success: true, data: parsedJson };
}

module.exports = { safeParseWithSchema };