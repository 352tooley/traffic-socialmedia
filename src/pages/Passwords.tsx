import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoreList, fetchPasswords } from '../services/sheetsService';
import type { StoreAuth } from '../types';
import { Layout, Button } from '../components';
import './Passwords.css';

export function Passwords() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [selectedStore, setSelectedStore] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState<StoreAuth[]>([]);

  const stores = getStoreList();

  useEffect(() => {
    // Only DM can access this page
    if (session?.role !== 'dm') {
      navigate('/');
      return;
    }
    loadPasswords();
  }, [session, navigate]);

  const loadPasswords = async () => {
    setLoading(true);
    try {
      const passwordData = await fetchPasswords();
      setPasswords(passwordData);
    } catch (err) {
      console.error('Error loading passwords:', err);
      setError('Failed to load passwords');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPassword = (storeName: string) => {
    const storeAuth = passwords.find(p => p.storeName === storeName);
    return storeAuth?.password || 'password';
  };

  const handleChangePassword = () => {
    if (!selectedStore) {
      setMessage('Please select a store first');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setError(`To change the password for ${selectedStore}, edit the "Passwords" tab in your Google Sheet. Find the row for "${selectedStore}" and update column B with the new password.`);
    setTimeout(() => setError(''), 10000);
  };

  if (loading) {
    return (
      <Layout title="Store Passwords" showBack>
        <div className="passwords-loading">Loading passwords...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Store Passwords" showBack>
      <div className="passwords-page">
        <h2>Store Passwords</h2>

        {error && <div className="passwords-error">{error}</div>}
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

          <Button onClick={handleChangePassword} disabled={!selectedStore}>
            How to Change Password
          </Button>
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

        <p className="passwords-hint">
          To change passwords, edit the "Passwords" tab in your Google Sheet directly.
          Default password for all stores is "password".
        </p>
      </div>
    </Layout>
  );
}
