const http = require('http');

console.log("🧪 Starting Legacy Ledger Smoke Test...");

http.get('http://localhost:5000/api/ping', (res) => {
    if (res.statusCode === 200) {
        console.log("✅ SUCCESS: Server is UP!");
        process.exit(0);
    } else {
        console.error("❌ FAIL: Status Code", res.statusCode);
        process.exit(1);
    }
}).on('error', (err) => {
    console.error("❌ FAIL: Server not running.");
    process.exit(1);
});