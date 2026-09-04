import React, { useState } from 'react';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
           // ❌ OLD:
// const response = await fetch('http://localhost:5000/api/auth/login', {

// ✅ Change it to this:
const response = await fetch('https://legacy-ledger.onrender.com/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // 🔒 Save the secure token to the browser
            localStorage.setItem('token', data.token);
            
            // Redirect to dashboard (update this path based on your router setup)
            window.location.href = '/'; 

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2>Create Your Legacy</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            
            <form onSubmit={handleRegister}>
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
                    {loading ? 'Creating Account...' : 'Register'}
                </button>
            </form>
            <p>Already have an account? <a href="/login">Log in here</a></p>
        </div>
    );
};

export default Register;