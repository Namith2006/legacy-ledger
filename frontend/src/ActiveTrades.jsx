import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ActiveTrades = () => {
  const [trades, setTrades] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTrade, setNewTrade] = useState({ ticker: '', buy_price: '', quantity: '' });
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrades = async () => {
    try {
      const res = await fetch('https://legacy-ledger.onrender.com/api/investments');
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

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAddTrade = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('https://legacy-ledger.onrender.com/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1,
          asset_symbol: newTrade.ticker,
          entry_price: parseFloat(newTrade.buy_price),
          quantity: parseInt(newTrade.quantity, 10)
        })
      });
      if (res.ok) {
        setNewTrade({ ticker: '', buy_price: '', quantity: '' });
        setIsAdding(false);
        fetchTrades(); 
      } else {
        alert("Server failed to save the trade.");
      }
    } catch (error) {
      alert("Lost connection to server.");
    }
  };

  const handleDeleteTrade = async (id) => {
    if (!window.confirm("Close this position?")) return;
    try {
      const res = await fetch(`https://legacy-ledger.onrender.com/api/investments/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTrades(trades.filter(t => t.id !== id));
      }
    } catch (error) {
      alert("Failed to close position.");
    }
  };

  // Master Portfolio Math
  const totalInvested = trades.reduce((acc, t) => acc + (parseFloat(t.entry_price) * parseInt(t.quantity || 1)), 0);
  const totalCurrent = trades.reduce((acc, t) => acc + (parseFloat(t.live_price) * parseInt(t.quantity || 1)), 0);
  const totalROI = totalInvested > 0 ? (((totalCurrent - totalInvested) / totalInvested) * 100).toFixed(2) : 0;
  const isPositiveOverall = totalCurrent >= totalInvested;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ marginTop: '50px', backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', border: '1px solid #333' }}>
      
      {/* --- HEADER --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#facc15', textTransform: 'uppercase', fontSize: '1.4rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ The War Room
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.9rem' }}>(Active Trades)</p>
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
            <span style={{ color: '#888', fontSize: '0.85rem', textTransform: 'uppercase' }}>Total ROI</span>
            <h3 style={{ margin: '5px 0 0 0', color: isPositiveOverall ? '#4ade80' : '#f87171' }}>
              {isPositiveOverall ? '+' : ''}{totalROI}%
            </h3>
          </div>
        </div>
      )}

      {/* --- ADD TRADE FORM --- */}
      {isAdding && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleAddTrade} style={{ backgroundColor: '#2d2d2d', padding: '20px', borderRadius: '10px', marginBottom: '25px', border: '1px solid #444', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input required type="text" placeholder="Ticker (e.g., TCS)" value={newTrade.ticker} onChange={(e) => setNewTrade({...newTrade, ticker: e.target.value.toUpperCase()})} style={{ flex: '1 1 150px', padding: '12px', borderRadius: '6px', backgroundColor: '#121212', color: 'white', border: '1px solid #555' }} />
          <input required type="number" step="0.01" placeholder="Buy Price (₹)" value={newTrade.buy_price} onChange={(e) => setNewTrade({...newTrade, buy_price: e.target.value})} style={{ flex: '1 1 120px', padding: '12px', borderRadius: '6px', backgroundColor: '#121212', color: 'white', border: '1px solid #555' }} />
          <input required type="number" placeholder="Quantity" value={newTrade.quantity} onChange={(e) => setNewTrade({...newTrade, quantity: e.target.value})} style={{ flex: '1 1 120px', padding: '12px', borderRadius: '6px', backgroundColor: '#121212', color: 'white', border: '1px solid #555' }} />
          <button type="submit" style={{ padding: '12px', backgroundColor: '#4ade80', color: '#121212', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: '1 1 100px' }}>Execute</button>
        </motion.form>
      )}

      {/* --- LIVE TRADES GRID --- */}
      {isLoading ? (
        <p style={{ color: '#888', textAlign: 'center' }}>Decrypting market data...</p>
      ) : trades.length > 0 ? (
        <div style={{ display: 'grid', gap: '15px' }}>
          {trades.map(trade => {
            const entry = parseFloat(trade.entry_price);
            const live = parseFloat(trade.live_price);
            const qty = parseInt(trade.quantity || 1);
            const roi = (((live - entry) / entry) * 100).toFixed(2);
            const isPositive = roi >= 0;

            return (
              <div key={trade.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: '15px 20px', borderRadius: '10px', borderLeft: `4px solid ${isPositive ? '#4ade80' : '#f87171'}`, flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1.5, minWidth: '120px' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{trade.asset_symbol}</h3>
                  <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.85rem' }}>{qty} Shares @ ₹{entry.toLocaleString('en-IN')}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', minWidth: '80px' }}>
                  <p style={{ margin: 0, color: '#888', fontSize: '0.75rem', textTransform: 'uppercase' }}>Live Price</p>
                  <h4 style={{ margin: '5px 0 0 0', color: '#fff', fontSize: '1.1rem' }}>₹{live.toLocaleString('en-IN', {minimumFractionDigits: 2})}</h4>
                </div>
                <div style={{ flex: 1, textAlign: 'right', minWidth: '80px' }}>
                  <p style={{ margin: 0, color: '#888', fontSize: '0.75rem', textTransform: 'uppercase' }}>Return</p>
                  <h4 style={{ margin: '5px 0 0 0', color: isPositive ? '#4ade80' : '#f87171', fontSize: '1.1rem' }}>
                    {isPositive ? '+' : ''}{roi}%
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
        <p style={{ color: '#888', textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>No active trades found. Waiting for intel...</p>
      )}
    </motion.div>
  );
}

export default ActiveTrades;