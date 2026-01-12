import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoreList, fetchPasswords, updateStorePassword, resetStorePassword as resetPassword, clearCache } from '../services/sheetsService';
import { APPS_SCRIPT_URL } from '../config';
import type { StoreAuth } from '../types';
import { Layout, Button } from '../components';
import './Passwords.css';

export function Passwords() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [selectedStore, setSelectedStore] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const handleResetToDefault = async () => {
    if (!selectedStore) {
      setMessage('Please select a store');
      return;
    }
    if (!confirm(`Reset ${selectedStore} password to default ("password")?`)) {
      return;
    }

    if (!APPS_SCRIPT_URL) {
      setError('Google Apps Script not configured. Contact administrator.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const success = await resetPassword(selectedStore);
      if (success) {
        clearCache();
        await loadPasswords();
        setMessage(`${selectedStore} password reset to default`);
        setNewPassword('');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Failed to reset password');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPassword = async () => {
    if (!selectedStore) {
      setMessage('Please select a store');
      return;
    }
    if (!newPassword.trim()) {
      setMessage('Please enter a new password');
      return;
    }

    if (!APPS_SCRIPT_URL) {
      setError('Google Apps Script not configured. Contact administrator.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const success = await updateStorePassword(selectedStore, newPassword.trim());
      if (success) {
        clearCache();
        await loadPasswords();
        setMessage(`${selectedStore} password updated`);
        setNewPassword('');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Failed to update password');
      }
    } catch (err) {
      console.error('Error updating password:', err);
      setError('Failed to update password');
    } finally {
      setSaving(false);
    }
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
        <h2>Reset Store Passwords</h2>

        {error && <div className="passwords-error">{error}</div>}
        {message && <div className="passwords-message">{message}</div>}

        <div className="passwords-form">
          <div className="passwords-field">
            <label>Select Store</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              disabled={saving}
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
              disabled={saving}
            />
          </div>

          <div className="passwords-actions">
            <Button onClick={handleSetPassword} disabled={!selectedStore || saving}>
              {saving ? 'Saving...' : 'Set New Password'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleResetToDefault}
              disabled={!selectedStore || saving}
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

        <p className="passwords-hint">
          Passwords are stored in Google Sheets.
        </p>
      </div>
    </Layout>
  );
}
