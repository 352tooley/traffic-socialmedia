import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addStore, removeStore, fetchStoreList, clearCache } from '../services/sheetsService';
import { APPS_SCRIPT_URL, type District } from '../config';
import { Layout, Button } from '../components';
import './ModifyDistrict.css';

export function ModifyDistrict() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [stores, setStores] = useState<string[]>([]);
  const [newStoreName, setNewStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isAppsScriptConfigured = Boolean(APPS_SCRIPT_URL);

  const district = session?.district || 'West';

  useEffect(() => {
    if (session?.role !== 'dm') {
      navigate('/');
      return;
    }
    loadStores(district);
  }, [session, navigate, district]);

  const loadStores = async (district: District) => {
    setLoading(true);
    try {
      clearCache();
      const storeList = await fetchStoreList(district);
      setStores(storeList);
    } catch (err) {
      console.error('Error loading stores:', err);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStore = async () => {
    const trimmed = newStoreName.trim();
    if (!trimmed) {
      setError('Please enter a store name');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!isAppsScriptConfigured) {
      setError('Apps Script URL not configured. Update stores directly in Google Sheet.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const success = await addStore(district, trimmed);
      if (success) {
        setMessage(`Added ${trimmed} to ${district}`);
        setNewStoreName('');
        await loadStores(district);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Failed to add store. It may already exist.');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error adding store:', err);
      setError('Failed to add store');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStore = async (storeName: string) => {
    if (!isAppsScriptConfigured) {
      setError('Apps Script URL not configured. Update stores directly in Google Sheet.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const confirmed = window.confirm(
      `Remove ${storeName} from ${district}? This also removes its roster and password rows.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError('');

    try {
      const success = await removeStore(district, storeName);
      if (success) {
        setMessage(`Removed ${storeName} from ${district}`);
        await loadStores(district);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Failed to remove store');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error removing store:', err);
      setError('Failed to remove store');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Modify District" showBack>
        <div className="modify-district-loading">Loading stores...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Modify District" showBack>
      <div className="modify-district-page">
        <h2>District Store List</h2>

        {error && <div className="modify-district-error">{error}</div>}
        {message && <div className="modify-district-message">{message}</div>}

        {!isAppsScriptConfigured && (
          <div className="modify-district-warning">
            Apps Script not configured. Changes must be made directly in Google Sheet.
          </div>
        )}

        <div className="modify-district-controls">
          <div className="modify-district-field">
            <label>District</label>
            <div className="modify-district-value">{district}</div>
          </div>

          <div className="modify-district-field">
            <label>New Store Name</label>
            <input
              type="text"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="Enter store name"
              disabled={submitting}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStore()}
            />
          </div>

          <Button onClick={handleAddStore} disabled={submitting || !newStoreName.trim()}>
            {submitting ? 'Saving...' : 'Add Store'}
          </Button>
        </div>

        <div className="modify-district-list">
          <h3>{district} Stores ({stores.length})</h3>
          {stores.length === 0 ? (
            <p className="modify-district-empty">No stores in this district yet.</p>
          ) : (
            <ul>
              {stores.map((store) => (
                <li key={store} className="modify-district-row">
                  <span>{store}</span>
                  <button
                    className="modify-district-remove"
                    onClick={() => handleRemoveStore(store)}
                    disabled={submitting}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
