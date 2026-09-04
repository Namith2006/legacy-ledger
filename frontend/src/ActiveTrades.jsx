import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ActiveTrades = () => {
  const [trades, setTrades] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [assetType, setAssetType] = useState('STOCK'); 
  const [newTrade, setNewTrade] = useState({ ticker: '', buy_price: '', quantity: '', total_amount: '' });
  const [isLoading, setIsLoading] = useState(true);

  // 🔒 Global Authentication Check
  const token = localStorage.getItem('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Base API URL (Set to localhost for testing, change to Render URL for production)
  const API_URL = '[https://legacy-ledger.onrender.com/api](https://legacy-ledger.onrender.com/api)';

  // --- 1. FETCH TRADES (SECURED) ---
  const fetchTrades = async () => {
    if (!token) return;

    try {
      // Assuming your route is mounted at /investments or /trades in server.js
      const res = await fetch(`${API_URL}/investments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTrades(data);
      }
    } catch (error) {
      console.error("Failed to fetch trades:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch immediately on load, then poll every 60 seconds
  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const toggleAssetType = (type) => {
    setAssetType(type);
    setNewTrade({ ticker: '', buy_price: '', quantity: '', total_amount: '' });
  };

  // --- 2. ADD TRADE (SECURED) ---
  const handleAddTrade = async (e) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      let submitTicker = newTrade.ticker;
      let submitQuantity = parseFloat(newTrade.quantity);

      if (assetType === 'GOLD') {
        submitTicker = 'DIGITALGOLD';
        const totalAmount = parseFloat(newTrade.total_amount);
        const buyRate = parseFloat(newTrade.buy_price);
        submitQuantity = totalAmount / buyRate; 
      }

      const res = await fetch(`${API_URL}/investments`, {
        method: 'POST',
        headers: authHeaders, // 🔒 Injects JWT
        body: JSON.stringify({
          asset_symbol: submitTicker,
          entry_price: parseFloat(newTrade.buy_price),
          quantity: submitQuantity
        })
      });

      if (res.ok) {
        setNewTrade({ ticker: '', buy_price: '', quantity: '', total_amount: '' });
        setIsAdding(false);
        fetchTrades(); 
      } else {
        alert("Server rejected the investment.");
      }
    } catch (error) {
      alert("Lost connection to server.");
    }
  };

  // --- 3. DELETE TRADE (SECURED) ---
  const handleDeleteTrade = async (id) => {
    if (!window.confirm("Liquidate this asset?")) return;
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/investments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` } // 🔒 Injects JWT
      });
      if (res.ok) {
        setTrades(trades.filter(t => t.id !== id));
      }
    } catch (error) {
      alert("Failed to close position.");
    }
  };

  // Portfolio Math
  const totalInvested = trades.reduce((acc, t) => acc + (parseFloat(t.entry_price) * parseFloat(t.quantity || 1)), 0);
  const totalCurrent = trades.reduce((acc, t) => acc + (parseFloat(t.live_price) * parseFloat(t.quantity || 1)), 0);
  const totalProfit = totalCurrent - totalInvested;
  const totalROI = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(2) : 0;
  const isPositiveOverall = totalCurrent >= totalInvested;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ marginTop: '50px', backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', border: '1px solid #333' }}>
      
      {/* --- HEADER --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#facc15', textTransform: 'uppercase', fontSize: '1.4rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ The War Room
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.9rem' }}>(Active Stocks & Gold Holdings)</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsAdding(!isAdding)} style={{ backgroundColor: '#facc15', color: '#121212', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          {isAdding ? 'Cancel' : '+ Deploy Capital'}
        </motion.button>
      </div>

      {/* --- PORTFOLIO SUMMARY WIDGET --- */}
      {trades.length > 0 && (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', backgroundColor: '#121212', padding: '15px', borderRadius: '10px', border: '1px solid #444', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '100px' }}>
            <span style={{ color: '#888', fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Invested</span>
            <h3 style={{ margin: '5px 0 0 0', color: '#fff' }}>₹{totalInvested.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid #333', paddingLeft: '20px', minWidth: '100px' }}>
            <span style={{ color: '#888', fontSize: '0.85rem', textTransform: 'uppercase' }}>Current Value</span>
            <h3 style={{ margin: '5px 0 0 0', color: isPositiveOverall ? '#4ade80' : '#f87171' }}>₹{totalCurrent.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid #333', paddingLeft: '20px', minWidth: '100px' }}>
            <span style={{ color: '#888', fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Profit / ROI</span>
            <h3 style={{ margin: '5px 0 0 0', color: isPositiveOverall ? '#4ade80' : '#f87171' }}>
              {isPositiveOverall ? '+' : ''}₹{totalProfit.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ({isPositiveOverall ? '+' : ''}{totalROI}%)
            </h3>
          </div>
        </div>
      )}

      {/* --- ADD ASSET FORM --- */}
      {isAdding && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleAddTrade} style={{ backgroundColor: '#2d2d2d', padding: '20px', borderRadius: '10px', marginBottom: '25px', border: '1px solid #444', display: 'flex', gap: '15px', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button type="button" onClick={() => toggleAssetType('STOCK')} style={{ flex: 1, padding: '10px', backgroundColor: assetType === 'STOCK' ? '#60a5fa' : '#333', color: assetType === 'STOCK' ? '#121212' : '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>📈 Indian Stocks</button>
            <button type="button" onClick={() => toggleAssetType('GOLD')} style={{ flex: 1, padding: '10px', backgroundColor: assetType === 'GOLD' ? '#facc15' : '#333', color: assetType === 'GOLD' ? '#121212' : '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>🪙 Digital Gold</button>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {assetType === 'STOCK' ? (
              <>
                <input required type="text" placeholder="Ticker (e.g., TCS)" value={newTrade.ticker} onChange={(e) => setNewTrade({...newTrade, ticker: e.target.value.toUpperCase()})} style={{ flex: '1 1 150px', padding: '12px', borderRadius: '6px', backgroundColor: '#121212', color: 'white', border: '1px solid #555' }} />
                <input required type="number" step="0.01" placeholder="Buy Price (₹)" value={newTrade.buy_price} onChange={(e) => setNewTrade({...newTrade, buy_price: e.target.value})} style={{ flex: '1 1 120px', padding: '12px', borderRadius: '6px', backgroundColor: '#121212', color: 'white', border: '1px solid #555' }} />
                <input required type="number" step="any" placeholder="Quantity / Shares" value={newTrade.quantity} onChange={(e) => setNewTrade({...newTrade, quantity: e.target.value})} style={{ flex: '1 1 120px', padding: '12px', borderRadius: '6px', backgroundColor: '#121212', color: 'white', border: '1px solid #555' }} />
              </>
            ) : (
              <>
                <input disabled type="text" value="DIGITAL GOLD" style={{ flex: '1 1 150px', padding: '12px', borderRadius: '6px', backgroundColor: '#222', color: '#facc15', border: '1px solid #facc15', fontWeight: 'bold', textAlign: 'center' }} />
                <input required type="number" step="0.01" placeholder="Total Invested (e.g., ₹2200)" value={newTrade.total_amount} onChange={(e) => setNewTrade({...newTrade, total_amount: e.target.value})} style={{ flex: '1 1 120px', padding: '12px', borderRadius: '6px', backgroundColor: '#121212', color: 'white', border: '1px solid #555' }} />
                <input required type="number" step="0.01" placeholder="Gold Rate per Gram (₹)" value={newTrade.buy_price} onChange={(e) => setNewTrade({...newTrade, buy_price: e.target.value})} style={{ flex: '1 1 120px', padding: '12px', borderRadius: '6px', backgroundColor: '#121212', color: 'white', border: '1px solid #555' }} />
              </>
            )}
            <button type="submit" style={{ padding: '12px', backgroundColor: '#4ade80', color: '#121212', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: '1 1 100px' }}>Deploy</button>
          </div>
        </motion.form>
      )}

      {/* --- ASSETS & HOLDINGS GRID --- */}
      {isLoading ? (
        <p style={{ color: '#888', textAlign: 'center' }}>Syncing market intelligence...</p>
      ) : trades.length > 0 ? (
        <div style={{ display: 'grid', gap: '15px' }}>
          {trades.map(trade => {
            const entry = parseFloat(trade.entry_price);
            const live = parseFloat(trade.live_price);
            const qty = parseFloat(trade.quantity || 1);
            
            const investedValue = entry * qty;
            const currentValue = live * qty;
            const profitValue = currentValue - investedValue;
            const roi = investedValue > 0 ? ((profitValue / investedValue) * 100).toFixed(2) : 0;
            const isPositive = profitValue >= 0;

            const isGold = trade.asset_symbol === 'DIGITALGOLD';

            return (
              <div key={trade.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: '15px 20px', borderRadius: '10px', borderLeft: `4px solid ${isPositive ? '#4ade80' : '#f87171'}`, flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1.5, minWidth: '140px' }}>
                  <h3 style={{ margin: 0, color: isGold ? '#facc15' : '#fff', fontSize: '1.1rem' }}>
                    {isGold ? '🪙 Digital Gold' : trade.asset_symbol}
                  </h3>
                  <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.85rem' }}>
                    {isGold ? `${qty.toFixed(4)} Grams` : `${qty} Shares`} @ ₹{entry.toLocaleString('en-IN')}
                  </p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', minWidth: '100px' }}>
                  <p style={{ margin: 0, color: '#888', fontSize: '0.75rem', textTransform: 'uppercase' }}>Market Price</p>
                  <h4 style={{ margin: '5px 0 0 0', color: '#fff', fontSize: '1.1rem' }}>₹{live.toLocaleString('en-IN', {minimumFractionDigits: 2})}</h4>
                </div>
                <div style={{ flex: 1.2, textAlign: 'right', minWidth: '120px' }}>
                  <p style={{ margin: '0', color: '#888', fontSize: '0.75rem', textTransform: 'uppercase' }}>Net Profit / ROI</p>
                  <h4 style={{ margin: '5px 0 0 0', color: isPositive ? '#4ade80' : '#f87171', fontSize: '1.1rem' }}>
                    {isPositive ? '+' : ''}₹{profitValue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ({isPositive ? '+' : ''}{roi}%)
                  </h4>
                </div>
                <div style={{ marginLeft: '10px' }}>
                  <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteTrade(trade.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1.2rem', padding: '5px' }} title="Close Position">✖</motion.button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: '#888', textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>No tracked assets found in the War Room.</p>
      )}
    </motion.div>
  );
}

export default ActiveTrades;