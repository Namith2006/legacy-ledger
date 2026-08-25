const safeAiParse = require('./safeAiParse');

// Mocked AI output wrapped in markdown code fences
const mockedResponse = "```json\n{ \"type\": \"expense\", \"amount\": 150 }\n```";

const result = safeAiParse(mockedResponse, { error: "fallback" });

if (result.amount === 150) {
    console.log("✅ Parser Test Passed: Successfully stripped markdown and parsed JSON.");
} else {
    console.error("❌ Parser Test Failed.");
}