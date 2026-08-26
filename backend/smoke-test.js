console.log("🧪 Starting Legacy Ledger Smoke Test...");

async function runTest() {
    try {
        console.log("📡 Pinging Backend API at http://localhost:5000/api/ping");
        
        const response = await fetch('http://localhost:5000/api/ping');
        const data = await response.json();

        // Accept any successful response from a running server
        if (response.ok && data.message) {
            console.log('✅ Server is healthy');
            process.exit(0); // Exit code 0 tells GitHub Actions the test PASSED
        } else {
            throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
        }
    } catch (err) {
        console.error("❌ FAIL: Server check failed.");
        console.error(err.message);
        process.exit(1); // Exit code 1 tells GitHub Actions the test FAILED
    }
}

// Run the function and add a timeout fallback
runTest();

setTimeout(() => {
    console.error("❌ FAIL: Request timed out after 5 seconds.");
    process.exit(1);
}, 5000);