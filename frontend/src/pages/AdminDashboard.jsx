import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState({ users: [], platform_stats: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = 'https://legacy-ledger.onrender.com/api';

  useEffect(() => {
    const fetchAdminData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No access token found. Please log in.');
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/admin/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          if (res.status === 403) throw new Error('Access Denied: Admin clearance required.');
          throw new Error('Failed to synchronize with platform data.');
        }

        const data = await res.json();
        setAdminData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (isLoading) return <div style={{ color: '#888', textAlign: 'center', marginTop: '50px' }}>Authenticating clearance...</div>;
  
  if (error) return (
    <div style={{ backgroundColor: '#1e1e1e', padding: '40px', textAlign: 'center', minHeight: '100vh', color: 'white' }}>
      <h2 style={{ color: '#f87171' }}>⚠️ Intrusion Blocked</h2>
      <p>{error}</p>
    </div>
  );

  const stats = adminData.platform_stats;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '40px', backgroundColor: '#121212', minHeight: '100vh', color: 'white' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          👁️ Overwatch Control
        </h1>
        <span style={{ backgroundColor: '#c084fc', color: '#000', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>
          SYSTEM ADMIN
        </span>
      </div>
      
      {/* --- MACRO METRICS WIDGET --- */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '12px', border: '1px solid #333', borderTop: '3px solid #60a5fa' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#888', textTransform: 'uppercase', fontSize: '0.85rem' }}>Registered Users</h4>
          <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold', color: '#fff' }}>{stats.total_users || 0}</p>
        </div>
        
        <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '12px', border: '1px solid #333', borderTop: '3px solid #facc15' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#888', textTransform: 'uppercase', fontSize: '0.85rem' }}>Active Trades</h4>
          <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold', color: '#fff' }}>{stats.total_active_trades || 0}</p>
        </div>
        
        <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '12px', border: '1px solid #333', borderTop: '3px solid #4ade80' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#888', textTransform: 'uppercase', fontSize: '0.85rem' }}>Platform Volume</h4>
          <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold', color: '#fff' }}>
            ₹{parseFloat(stats.total_platform_transaction_volume || 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* --- USER DATABASE TABLE --- */}
      <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '12px', border: '1px solid #333' }}>
        <h3 style={{ marginTop: 0, color: '#fff', marginBottom: '20px' }}>User Database</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#888', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px', borderBottom: '2px solid #333' }}>System ID</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #333' }}>Email / Contact</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #333' }}>Clearance</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #333' }}>Join Date</th>
              </tr>
            </thead>
            <tbody>
              {adminData.users.map(user => (
                <tr key={user.id} style={{ transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#222'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '15px 12px', borderBottom: '1px solid #333', color: '#aaa', fontFamily: 'monospace' }}>
                    {user.id.substring(0,8)}...
                  </td>
                  <td style={{ padding: '15px 12px', borderBottom: '1px solid #333', fontWeight: '500' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '15px 12px', borderBottom: '1px solid #333' }}>
                    <span style={{ 
                      backgroundColor: user.role === 'admin' ? '#c084fc' : '#333', 
                      color: user.role === 'admin' ? '#000' : '#fff', 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '15px 12px', borderBottom: '1px solid #333', color: '#888' }}>
                    {new Date(user.created_at).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;