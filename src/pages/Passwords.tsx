import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoreList } from '../services/sheetsService';
import { Layout, Button } from '../components';
import './Passwords.css';

export function Passwords() {
  const { session, getStorePassword, setStorePassword, resetStorePassword } = useAuth();
  const navigate = useNavigate();
  const [selectedStore, setSelectedStore] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const stores = getStoreList();

  // Only DM can access this page
  if (session?.role !== 'dm') {
    navigate('/');
    return null;
  }

  const handleResetToDefault = () => {
    if (!selectedStore) {
      setMessage('Please select a store');
      return;
    }
    if (confirm(`Reset ${selectedStore} password to default ("password")?`)) {
      resetStorePassword(selectedStore);
      setMessage(`${selectedStore} password reset to default`);
      setNewPassword('');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSetPassword = () => {
    if (!selectedStore) {
      setMessage('Please select a store');
      return;
    }
    if (!newPassword.trim()) {
      setMessage('Please enter a new password');
      return;
    }
    setStorePassword(selectedStore, newPassword.trim());
    setMessage(`${selectedStore} password updated`);
    setNewPassword('');
    setTimeout(() => setMessage(''), 3000);
  };

  const getCurrentPassword = (storeName: string) => {
    return getStorePassword(storeName);
  };

  return (
    <Layout title="Store Passwords" showBack>
      <div className="passwords-page">
        <h2>Reset Store Passwords</h2>

        {message && <div className="passwords-message">{message}</div>}

        <div className="passwords-form">
          <div className="passwords-field">
            <label>Select Store</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
            >
              <option value="">Choose a store...</option>
              {stores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>

          {selectedStore && (
            <div className="passwords-current">
              Current password: <strong>{getCurrentPassword(selectedStore)}</strong>
            </div>
          )}

          <div className="passwords-field">
            <label>New Password</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="passwords-actions">
            <Button onClick={handleSetPassword} disabled={!selectedStore}>
              Set New Password
            </Button>
            <Button
              variant="secondary"
              onClick={handleResetToDefault}
              disabled={!selectedStore}
            >
              Reset to Default
            </Button>
          </div>
        </div>

        {/* All stores list */}
        <div className="passwords-list">
          <h3>All Store Passwords</h3>
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>Password</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store}>
                  <td>{store}</td>
                  <td>{getCurrentPassword(store)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
