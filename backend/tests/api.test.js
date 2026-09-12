const request = require('supertest');
const app = require('../server'); // Make sure server.js exports the 'app'

describe('Legacy Ledger API Health & Security', () => {
    
    // Test 1: Uptime Check
    it('should return a 200 OK status from the ping route', async () => {
        const res = await request(app).get('/api/ping');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message');
    });

    // Test 2: Security Firewall Check
    it('should block unauthorized access to the War Room', async () => {
        const res = await request(app).get('/api/investments');
        // Expect a 401 Unauthorized because no JWT token was provided
        expect(res.statusCode).toEqual(401); 
    });
});