import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoreRoster, addToRoster, removeFromRoster, clearCache } from '../services/sheetsService';
import { APPS_SCRIPT_URL } from '../config';
import { Layout, Button } from '../components';
import './Roster.css';

export function Roster() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roster, setRoster] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get store name from URL params (for DM viewing specific store) or session
  const urlStoreName = searchParams.get('store');
  const storeName = urlStoreName || session?.storeName || '';

  const isAppsScriptConfigured = Boolean(APPS_SCRIPT_URL);

  useEffect(() => {
    // Only store managers and DMs can access roster
    if (session?.role !== 'store' && session?.role !== 'dm') {
      navigate('/');
      return;
    }
    loadRoster();
  }, [session, navigate, storeName]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      clearCache();
      const sheetRoster = await getStoreRoster(storeName);
      setRoster(sheetRoster);
    } catch (err) {
      console.error('Error loading roster:', err);
      setError('Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  const handleAddName = async () => {
    if (!newName.trim()) {
      setError('Please enter a name');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!isAppsScriptConfigured) {
      setError('Apps Script URL not configured. Add name directly in Google Sheet.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const success = await addToRoster(storeName, newName.trim());
      if (success) {
        setMessage(`Added ${newName.trim()} to roster`);
        setNewName('');
        await loadRoster();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Failed to add name. May already exist.');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error adding to roster:', err);
      setError('Failed to add name');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveName = async (name: string) => {
    if (!isAppsScriptConfigured) {
      setError('Apps Script URL not configured. Remove name directly in Google Sheet.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const success = await removeFromRoster(storeName, name);
      if (success) {
        setMessage(`Removed ${name} from roster`);
        await loadRoster();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError('Failed to remove name');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error removing from roster:', err);
      setError('Failed to remove name');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    loadRoster();
  };

  if (loading) {
    return (
      <Layout title="Manage Roster" showBack>
        <div className="roster-loading">Loading roster...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Manage Roster" showBack>
      <div className="roster-page">
        <h2 className="roster-store">{storeName}</h2>

        {error && <div className="roster-error">{error}</div>}
        {message && <div className="roster-message">{message}</div>}

        {!isAppsScriptConfigured && (
          <div className="roster-warning">
            Apps Script not configured. Changes must be made directly in Google Sheet.
          </div>
        )}

        {/* Add new mobile expert */}
        <div className="roster-add">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Mobile expert name"
            disabled={submitting}
            onKeyDown={(e) => e.key === 'Enter' && handleAddName()}
          />
          <Button onClick={handleAddName} disabled={submitting || !newName.trim()}>
            {submitting ? 'Adding...' : 'Add'}
          </Button>
        </div>

        <div className="roster-refresh">
          <Button onClick={handleRefresh} variant="secondary">
            Refresh Roster
          </Button>
        </div>

        {/* Roster list */}
        <div className="roster-list">
          <h3>Mobile Experts ({roster.length})</h3>
          {roster.length === 0 ? (
            <p className="roster-empty">No mobile experts in roster yet.</p>
          ) : (
            <ul>
              {roster.map((name) => (
                <li key={name}>
                  <span>{name}</span>
                  <button
                    className="roster-remove"
                    onClick={() => handleRemoveName(name)}
                    disabled={submitting}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="roster-hint">
          Mobile experts will see their name in a dropdown when they sign in to upload photos.
        </p>
      </div>
    </Layout>
  );
}
