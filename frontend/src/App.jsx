import { useState, useEffect } from 'react';
import './App.css';
import ActiveTrades from './ActiveTrades';

function App() {
  // --- Standard States ---
  const [balanceData, setBalanceData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  
  const [smartInput, setSmartInput] = useState('');
  const [isSmartLoading, setIsSmartLoading] = useState(false);

  // --- Mode 1: On-Demand Radar States ---
  const [researchQuery, setResearchQuery] = useState('');
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const [researchResult, setResearchResult] = useState(null);

  // --- Mode 2: Guided Discovery States ---
  const [advisorStep, setAdvisorStep] = useState(0); 
  const [discoveryAnswers, setDiscoveryAnswers] = useState({
    horizon: '', risk: '', sector: '', budget: '', goal: ''
  });
  const [discoveryResults, setDiscoveryResults] = useState(null);

  // Fetch initial dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Balance
        const balanceRes = await fetch('https://legacy-ledger.onrender.com/api/transactions/balance/1');
        if (balanceRes.ok) {
          const data = await balanceRes.json();
          setBalanceData(data);
        }

        // 2. Fetch Transactions
        const transRes = await fetch('https://legacy-ledger.onrender.com/api/transactions/1');
        if (transRes.ok) {
          const data = await transRes.json();
          setTransactions(Array.isArray(data) ? data : []);
        }

        // 3. Fetch Goals
        const goalsRes = await fetch('https://legacy-ledger.onrender.com/api/goals/1');
        if (goalsRes.ok) {
          const data = await goalsRes.json();
          setGoals(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("❌ Dashboard Load Error:", err);
      }
    };

    fetchData();
  }, []);

  // Mode 1: Market Radar Function
  const handleResearch = async (e) => { 
    e.preventDefault(); 
    if (!researchQuery) return; 
    setIsResearchLoading(true); 
    setResearchResult(null); 
    try { 
      const response = await fetch('https://legacy-ledger.onrender.com/api/ai/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: researchQuery, currentBalance: balanceData ? balanceData.netBalance : 0 }) }); 
      const result = await response.json(); 
      if (response.ok) { setResearchResult(result.data); } else { alert(result.message); } 
    } catch (error) { alert("Market connection lost."); } 
    setIsResearchLoading(false); 
    setResearchQuery(''); 
  };

  // Smart Entry Function
  const handleSmartEntry = async (e) => { 
    e.preventDefault(); 
    if (!smartInput) return; 
    setIsSmartLoading(true); 
    try { 
      const aiResponse = await fetch('https://legacy-ledger.onrender.com/api/ai/smart-entry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawText: smartInput }) }); 
      const aiResult = await aiResponse.json(); 
      const ext = aiResult.data; 
      const saveResponse = await fetch('https://legacy-ledger.onrender.com/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 1, type: ext.type, amount: ext.amount, category: ext.category, description: ext.description }) }); 
      if (saveResponse.ok) { 
        fetch('https://legacy-ledger.onrender.com/api/transactions/balance/1').then(res => res.json()).then(data => setBalanceData(data)); 
        fetch('https://legacy-ledger.onrender.com/api/transactions/1').then(res => res.json()).then(data => setTransactions(data)); 
        setSmartInput(''); 
      } 
    } catch (error) { alert("Error parsing transaction."); } 
    setIsSmartLoading(false); 
  };

  // --- Mode 2: Handle Robo-Advisor Logic ---
  const handleAnswer = (key, value) => {
    setDiscoveryAnswers(prev => ({ ...prev, [key]: value }));
    setAdvisorStep(prev => prev + 1); 
  };

  const submitDiscovery = async (e, overrideAnswers = null) => {
    if (e) e.preventDefault();
    setAdvisorStep(6); 
    const finalAnswers = overrideAnswers || discoveryAnswers;
    
    try {
      const response = await fetch('https://legacy-ledger.onrender.com/api/ai/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalAnswers)
      });
      
      const data = await response.json();

      // --- THE NEW SHIELD ---
      // If Gemini is busy, alert the user and reset the UI!
      if (!response.ok) {
        alert("Gemini is currently caught in global traffic! Please wait a moment and try again.");
        setAdvisorStep(0);
        return; // Stop running the function here
      }

      setDiscoveryResults(data.recommendations);
      setAdvisorStep(7); 
      
    } catch (error) {
      alert("Lilith's discovery engine lost connection to the market.");
      setAdvisorStep(0);
    }
  };

  const resetAdvisor = () => {
    setAdvisorStep(0);
    setDiscoveryAnswers({ horizon: '', risk: '', sector: '', budget: '', goal: '' });
    setDiscoveryResults(null);
  };

  const StepButton = ({ label, onClick }) => (
    <button onClick={onClick} style={{ padding: '12px 20px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '8px', cursor: 'pointer', flex: 1, fontSize: '1rem', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }} onMouseOver={e => {e.target.style.backgroundColor = '#60a5fa'; e.target.style.color = '#121212'; e.target.style.transform = 'scale(1.02)';}} onMouseOut={e => {e.target.style.backgroundColor = '#333'; e.target.style.color = 'white'; e.target.style.transform = 'scale(1)';}}>
      {label}
    </button>
  );

  return (
    <div className="dashboard-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', fontFamily: 'sans-serif' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '5px' }}>Legacy Ledger</h1>
        <p style={{ color: '#888' }}>Welcome to your financial dashboard!</p>
      </div>

      {/* --- MODE 1: ON-DEMAND RADAR --- */}
      <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', border: '1px solid #444' }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#a3a3a3', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>📡 On-Demand Analysis</h2>
        <form onSubmit={handleResearch} style={{ display: 'flex', gap: '10px' }}>
          <input type="text" value={researchQuery} onChange={(e) => setResearchQuery(e.target.value)} placeholder="Analyze specific stock (e.g., Tata Motors)..." style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#121212', color: 'white', fontSize: '1rem' }} />
          <button type="submit" disabled={isResearchLoading} style={{ padding: '12px 24px', backgroundColor: '#facc15', color: '#121212', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: isResearchLoading ? 'not-allowed' : 'pointer' }}>
            {isResearchLoading ? 'Scanning...' : 'Analyze'}
          </button>
        </form>
        
        {researchResult && (
          <div className="animate-slide-up" style={{ marginTop: '20px', padding: '20px', backgroundColor: '#2d2d2d', borderRadius: '8px', borderLeft: `4px solid ${researchResult.change >= 0 ? '#4ade80' : '#f87171'}` }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '15px' }}>
              <div><h3 style={{ margin: '0', fontSize: '1.3rem' }}>{researchResult.company}</h3><span style={{ color: '#888' }}>{researchResult.ticker}</span></div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: '0', color: researchResult.change >= 0 ? '#4ade80' : '#f87171' }}>₹{researchResult.price.toFixed(2)}</h2>
                <span style={{ color: researchResult.change >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                  {researchResult.change > 0 ? '+' : ''}{researchResult.change.toFixed(2)}%
                </span>
              </div>
            </div>

            <p style={{ fontStyle: 'italic', margin: 0, color: '#d4d4d4', whiteSpace: 'pre-line', lineHeight: '1.6', backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '8px', border: '1px solid #444' }}>{researchResult.analysis}</p>

            <button 
              onClick={() => setResearchResult(null)} 
              style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer', width: '100%', transition: 'background 0.2s', fontWeight: 'bold' }}
              onMouseOver={e => e.target.style.backgroundColor = '#444'} 
              onMouseOut={e => e.target.style.backgroundColor = '#333'}
            >
              Clear Analysis
            </button>
          </div>
        )}
      </div>

      {/* --- MODE 2: ROBO-ADVISOR GUIDED DISCOVERY --- */}
      <div style={{ backgroundColor: '#1e1e1e', padding: '25px', borderRadius: '15px', marginBottom: '40px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', border: '1px solid #60a5fa' }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#60a5fa', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>🤖 Guided Discovery</h2>
        
        {advisorStep === 0 && (
          <button className="animate-slide-up" onClick={() => setAdvisorStep(1)} style={{ width: '100%', padding: '15px', backgroundColor: '#60a5fa', color: '#121212', fontWeight: 'bold', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer' }}>
            Find Stocks For Me
          </button>
        )}

        {advisorStep === 1 && (
          <div className="animate-slide-up">
            <p style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#fff' }}>1. Are you looking for a short-term trade or a long-term investment?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <StepButton label="Short-term (Days/Weeks)" onClick={() => handleAnswer('horizon', 'Short-term')} />
              <StepButton label="Long-term (Years)" onClick={() => handleAnswer('horizon', 'Long-term')} />
            </div>
          </div>
        )}

        {advisorStep === 2 && (
          <div className="animate-slide-up">
            <p style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#fff' }}>2. How much risk are you comfortable with?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <StepButton label="Low Risk (Steady)" onClick={() => handleAnswer('risk', 'Low risk')} />
              <StepButton label="Medium Risk" onClick={() => handleAnswer('risk', 'Medium risk')} />
              <StepButton label="High Reward" onClick={() => handleAnswer('risk', 'High risk')} />
            </div>
          </div>
        )}

        {advisorStep === 3 && (
          <div className="animate-slide-up">
            <p style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#fff' }}>3. Are there any specific industries you are interested in?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <StepButton label="IT & Tech" onClick={() => handleAnswer('sector', 'IT & Tech')} />
              <StepButton label="Banking" onClick={() => handleAnswer('sector', 'Banking')} />
              <StepButton label="Renewable/Defense" onClick={() => handleAnswer('sector', 'Renewable Energy or Defense')} />
              <StepButton label="Surprise Me" onClick={() => handleAnswer('sector', 'Any diverse sector')} />
            </div>
          </div>
        )}

        {advisorStep === 4 && (
          <div className="animate-slide-up">
            <p style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#fff' }}>4. Roughly how much capital are you allocating (₹)?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="number" required value={discoveryAnswers.budget} onChange={(e) => setDiscoveryAnswers({...discoveryAnswers, budget: e.target.value})} placeholder="e.g., 5000" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#121212', color: 'white', fontSize: '1rem' }} />
              <button onClick={() => setAdvisorStep(5)} disabled={!discoveryAnswers.budget} style={{ padding: '12px 24px', backgroundColor: '#60a5fa', color: '#121212', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Next</button>
            </div>
          </div>
        )}

        {advisorStep === 5 && (
          <div className="animate-slide-up">
            <p style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#fff' }}>5. What is the primary goal for this specific investment?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              {goals.map(g => (
                <StepButton key={g.id} label={`Target: ${g.title}`} onClick={() => { 
                  const updatedAnswers = { ...discoveryAnswers, goal: g.title };
                  setDiscoveryAnswers(updatedAnswers); 
                  submitDiscovery(null, updatedAnswers);
                }} />
              ))}
              <StepButton label="General Wealth Building" onClick={() => {
                  const updatedAnswers = { ...discoveryAnswers, goal: 'General Wealth Building' };
                  setDiscoveryAnswers(updatedAnswers); 
                  submitDiscovery(null, updatedAnswers);
              }} />
            </div>
          </div>
        )}

        {advisorStep === 6 && (
          <div className="animate-radar" style={{ padding: '30px', textAlign: 'center', color: '#60a5fa' }}>
            <h3>Lilith is aligning the market with your goals...</h3>
            <p style={{ color: '#888' }}>Scanning the Indian market based on your profile.</p>
          </div>
        )}

       {advisorStep === 7 && discoveryResults && (
          <div className="animate-slide-up" style={{ padding: '20px', backgroundColor: '#121212', borderRadius: '8px', borderLeft: '4px solid #60a5fa' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#60a5fa' }}>Tailored Recommendations:</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {Array.isArray(discoveryResults) ? discoveryResults.map((stock, index) => (
                <div key={index} className="stock-card" style={{ padding: '15px', backgroundColor: '#1e1e1e', borderRadius: '8px', border: '1px solid #333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: '#60a5fa', fontSize: '1.1rem' }}>{stock.company} <span style={{color: '#888', fontSize: '0.9rem'}}>({stock.ticker})</span></h4>
                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#fff' }}>₹{stock.price.toFixed(2)}</span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: '#ccc', margin: '10px 0', lineHeight: '1.5' }}>{stock.reason}</p>
                  <div style={{ backgroundColor: '#2d2d2d', padding: '10px', borderRadius: '5px', textAlign: 'center', border: '1px solid #4ade80' }}>
                    <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      Affordable: {stock.quantity} Shares
                    </span>
                  </div>
                </div>
              )) : (
                <p style={{ lineHeight: '1.7', whiteSpace: 'pre-line', color: '#e5e5e5', margin: 0 }}>{discoveryResults}</p>
              )}
            </div>

            <button onClick={resetAdvisor} style={{ marginTop: '30px', padding: '12px 20px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer', width: '100%', fontWeight: 'bold', transition: 'background 0.2s' }} onMouseOver={e => e.target.style.backgroundColor = '#444'} onMouseOut={e => e.target.style.backgroundColor = '#333'}>
              Initialize New Scan
            </button>
          </div>
        )}
      </div>

      {/* --- SMART ENTRY BAR --- */}
      <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '15px', marginBottom: '40px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#a3a3a3', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>⚡ Smart Entry</h2>
        <form onSubmit={handleSmartEntry} style={{ display: 'flex', gap: '10px' }}>
          <input type="text" value={smartInput} onChange={(e) => setSmartInput(e.target.value)} placeholder="e.g., Spent 450 on food..." style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#2d2d2d', color: 'white' }} />
          <button type="submit" disabled={isSmartLoading} style={{ padding: '12px 24px', backgroundColor: '#4ade80', color: '#121212', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>Add</button>
        </form>
      </div>

      {/* --- THE BALANCE CARD --- */}
      <div style={{ backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#a3a3a3', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Net Worth</h2>
        {balanceData ? <h1 style={{ fontSize: '4rem', margin: '0', color: '#4ade80' }}>₹{balanceData.netBalance}</h1> : <p>Loading...</p>}
      </div>
      <ActiveTrades />
      
      {/* --- THE MILESTONES SECTION --- */}
      <div style={{ marginTop: '50px' }}>
        <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px', color: '#a3a3a3', textTransform: 'uppercase', fontSize: '1.2rem', letterSpacing: '1px' }}>Financial Milestones</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {goals.length > 0 ? (
            goals.map((goal) => {
              const progressPercentage = Math.min((goal.current_amount / goal.target_amount) * 100, 100).toFixed(1);

              return (
                <div key={goal.id} className="stock-card" style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ margin: '0', fontSize: '1.2rem', color: '#fff' }}>{goal.title}</h3>
                    <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{progressPercentage}%</span>
                  </div>
                  
                  <div style={{ width: '100%', backgroundColor: '#333', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{ width: `${progressPercentage}%`, backgroundColor: '#60a5fa', height: '100%', transition: 'width 0.5s ease-in-out' }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#888' }}>
                    <span>₹{goal.current_amount} Saved</span>
                    <span>Target: ₹{goal.target_amount}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ textAlign: 'center', color: '#888' }}>No goals set yet.</p>
          )}
        </div>
      </div>

      {/* --- THE TRANSACTION HISTORY --- */}
      <div style={{ marginTop: '50px', marginBottom: '40px' }}>
        <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px', color: '#a3a3a3', textTransform: 'uppercase', fontSize: '1.2rem', letterSpacing: '1px' }}>Recent Activity</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {transactions.length > 0 ? (
            transactions.map((txn) => (
              <div key={txn.id} className="stock-card" style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#fff' }}>{txn.description}</h3>
                  <span style={{ backgroundColor: '#333', padding: '4px 8px', borderRadius: '5px', fontSize: '0.8rem', color: '#aaa', textTransform: 'capitalize' }}>
                    {txn.category}
                  </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: txn.type === 'income' ? '#4ade80' : '#f87171' }}>
                  {txn.type === 'income' ? '+' : '-'}₹{txn.amount}
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: '#888' }}>No transactions found.</p>
          )}
        </div>
      </div>

    </div>
  );
}

export default App;