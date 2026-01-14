import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchStoreList, fetchPasswords, updateStorePassword, resetStorePassword, clearCache } from '../services/sheetsService';
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
  const [loadingStores, setLoadingStores] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [passwords, setPasswords] = useState<StoreAuth[]>([]);
  const [stores, setStores] = useState<string[]>([]);

  const district = session?.district || 'West';
  const isAppsScriptConfigured = Boolean(APPS_SCRIPT_URL);

  useEffect(() => {
    // Only DM can access this page
    if (session?.role !== 'dm') {
      navigate('/');
      return;
    }
    loadStores();
    loadPasswords();
  }, [session, navigate, district]);

  const loadPasswords = async () => {
    setLoading(true);
    try {
      clearCache();
      const passwordData = await fetchPasswords();
      setPasswords(passwordData);
    } catch (err) {
      console.error('Error loading passwords:', err);
      setError('Failed to load passwords');
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const storeList = await fetchStoreList(district);
      setStores(storeList);
    } catch (err) {
      console.error('Error loading stores:', err);
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  };

  const getCurrentPassword = (storeName: string) => {
    const storeAuth = passwords.find(p => p.storeName === storeName && p.district === district);
    return storeAuth?.password || 'password';
  };

  const handleChangePassword = async () => {
    if (!selectedStore) {
      setError('Please select a store first');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!newPassword.trim()) {
      setError('Please enter a new password');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!isAppsScriptConfigured) {
      setError('Apps Script URL not configured. Change password directly in Google Sheet.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const success = await updateStorePassword(selectedStore, newPassword.trim());
      if (success) {
        setMessage(`Password updated for ${selectedStore}`);
        setNewPassword('');
        await loadPasswords();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Failed to update password');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error updating password:', err);
      setError('Failed to update password');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (storeName: string) => {
    if (!isAppsScriptConfigured) {
      setError('Apps Script URL not configured. Reset password directly in Google Sheet.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const success = await resetStorePassword(storeName);
      if (success) {
        setMessage(`Password reset to default for ${storeName}`);
        await loadPasswords();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Failed to reset password');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('Failed to reset password');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingStores) {
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

        {!isAppsScriptConfigured && (
          <div className="passwords-warning">
            Apps Script not configured. Changes must be made directly in Google Sheet.
          </div>
        )}

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
            <>
              <div className="passwords-current">
                Current password: <strong>{getCurrentPassword(selectedStore)}</strong>
              </div>

              <div className="passwords-field">
                <label>New Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={submitting}
                />
              </div>

              <Button onClick={handleChangePassword} disabled={submitting || !newPassword.trim()}>
                {submitting ? 'Updating...' : 'Update Password'}
              </Button>
            </>
          )}
        </div>

        {/* All stores list */}
        <div className="passwords-list">
          <h3>All Store Passwords</h3>
          <div className="passwords-refresh">
            <Button onClick={loadPasswords} variant="secondary">
              Refresh
            </Button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>Password</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store}>
                  <td>{store}</td>
                  <td>{getCurrentPassword(store)}</td>
                  <td>
                    <button
                      className="passwords-reset"
                      onClick={() => handleResetPassword(store)}
                      disabled={submitting}
                    >
                      Reset
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="passwords-hint">
          Default password is "password". Use Reset to restore default.
        </p>
      </div>
    </Layout>
  );
}
