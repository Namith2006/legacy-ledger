import React, { useState, useEffect } from 'react';

const ActiveTrades = () => {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    // Fetching the live data from your new backend route!
    fetch('http://localhost:5000/api/investments')
      .then(res => {
        // SAFETY NET 1: If the server throws a 500 error, stop here!
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then(data => {
        // SAFETY NET 2: Only save the data if it is actually a list (Array)
        if (Array.isArray(data)) {
          setTrades(data);
        } else {
          setTrades([]); 
        }
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setTrades([]); // If it fails, just show the empty state
      });
  }, []);

  return (
    <div className="mt-8 animate-slide-up">
      <h2 className="text-xl font-bold text-gray-200 mb-4 tracking-wider">⚡ THE WAR ROOM (ACTIVE TRADES)</h2>
      
      {/* SAFETY NET 3: Make absolutely sure it's an array before mapping! */}
      {!Array.isArray(trades) || trades.length === 0 ? (
        <p className="text-gray-400">No active trades found. Waiting for intel...</p>
      ) : (
        trades.map(trade => {
          // Note: Since we built the Live Engine on the backend, 
          // we can use trade.live_price here instead of the mock 16500!
          // (Fallback to 16500 just in case the backend price is missing)
          const liveMarketPrice = trade.live_price || 16500; 
          
          // The Strategy Math
          const profit = liveMarketPrice - trade.entry_price;
          const isProfit = profit >= 0;
          
          const totalRange = trade.target_sell_price - trade.stop_loss_price;
          const currentProgress = liveMarketPrice - trade.stop_loss_price;
          const percentage = Math.min(Math.max((currentProgress / totalRange) * 100, 0), 100);

          return (
            <div key={trade.id} className="bg-[#1e2330] p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden transition-all hover:-translate-y-1">
              <div className={`absolute left-0 top-0 w-1 h-full ${isProfit ? 'bg-green-400' : 'bg-red-400'}`}></div>

              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{trade.asset_name}</h3>
                  <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded mt-1 inline-block">
                    {trade.asset_symbol} | Qty: {trade.quantity}
                  </span>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                    ₹{liveMarketPrice.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">Live Market Price</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-red-400">SL: ₹{trade.stop_loss_price}</span>
                  <span className="text-gray-400">ENTRY: ₹{trade.entry_price}</span>
                  <span className="text-green-400">TP: ₹{trade.target_sell_price}</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-3 border border-gray-700 relative">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${isProfit ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                  <div className="absolute top-0 bottom-0 left-[25%] w-0.5 bg-gray-500 z-10"></div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ActiveTrades;