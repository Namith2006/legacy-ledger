import React, { useState } from 'react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
           // ❌ OLD:
// const response = await fetch('http://localhost:5000/api/auth/login', {

// ✅ Change the fetch URL in Login.jsx to:
const response = await fetch('https://legacy-ledger.onrender.com/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // 🔒 Save the secure token to the browser
            localStorage.setItem('token', data.token);
            
            // Redirect to dashboard
            window.location.href = '/'; 

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2>Welcome Back</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            
            <form onSubmit={handleLogin}>
                <div>
                    <label>Email:</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                    />
                </div>
                <div>
                    <label>Password:</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Authenticating...' : 'Login'}
                </button>
            </form>
            <p>Don't have an account? <a href="/register">Create one here</a></p>
        </div>
    );
};

export default Login;