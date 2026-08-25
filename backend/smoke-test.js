 const http = require('http');

console.log("🧪 Starting Legacy Ledger Smoke Test...");
console.log("📡 Pinging Backend API at http://localhost:5000/api/ping");

const req = http.get('http://localhost:5000/api/ping', (res) => {
    let data = '';
    
    // Read the incoming response data
    res.on('data', (chunk) => {
        data += chunk;
    });

    // When the response is completely received
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log(`✅ SUCCESS: Server is UP and returned Status 200!`);
            console.log(`📝 Server says: ${data}`);
            process.exit(0); // Exit Code 0 tells GitHub Actions the test PASSED
        } else {
            console.error(`❌ FAIL: Server returned status ${res.statusCode}`);
            console.error(`📝 Raw Output: ${data}`);
            process.exit(1); // Exit Code 1 tells GitHub Actions it FAILED
        }
    });
});

// Handle cases where the server is completely offline
req.on('error', (err) => {
    console.error(`❌ FAIL: Connection refused. Server might not be running.`);
    console.error(`Details: ${err.message}`);
    process.exit(1);
});

// Fallback timeout just in case it hangs
setTimeout(() => {
    console.error("❌ FAIL: Request timed out after 5 seconds.");
    process.exit(1);
}, 5000);