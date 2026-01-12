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
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Get store name from URL params (for DM viewing specific store) or session
  const urlStoreName = searchParams.get('store');
  const storeName = urlStoreName || session?.storeName || '';

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
      const sheetRoster = await getStoreRoster(storeName);
      setRoster(sheetRoster);
    } catch (err) {
      console.error('Error loading roster:', err);
      setError('Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMobileExpert = async () => {
    const name = newName.trim();
    if (!name) return;
    if (roster.includes(name)) {
      setMessage('Name already exists');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!APPS_SCRIPT_URL) {
      setError('Google Apps Script not configured. Contact administrator.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const success = await addToRoster(storeName, name);
      if (success) {
        clearCache();
        await loadRoster();
        setNewName('');
        setMessage('Mobile expert added');
        setTimeout(() => setMessage(''), 2000);
      } else {
        setError('Failed to add mobile expert');
      }
    } catch (err) {
      console.error('Error adding to roster:', err);
      setError('Failed to add mobile expert');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMobileExpert = async (name: string) => {
    if (!confirm(`Remove "${name}" from roster?`)) return;

    if (!APPS_SCRIPT_URL) {
      setError('Google Apps Script not configured. Contact administrator.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const success = await removeFromRoster(storeName, name);
      if (success) {
        clearCache();
        await loadRoster();
        setMessage('Mobile expert removed');
        setTimeout(() => setMessage(''), 2000);
      } else {
        setError('Failed to remove mobile expert');
      }
    } catch (err) {
      console.error('Error removing from roster:', err);
      setError('Failed to remove mobile expert');
    } finally {
      setSaving(false);
    }
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

        {/* Add new mobile expert */}
        <div className="roster-add">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter mobile expert name"
            onKeyDown={(e) => e.key === 'Enter' && handleAddMobileExpert()}
            disabled={saving}
          />
          <Button onClick={handleAddMobileExpert} disabled={!newName.trim() || saving}>
            {saving ? 'Adding...' : 'Add'}
          </Button>
        </div>

        {/* Roster list */}
        <div className="roster-list">
          <h3>Mobile Experts ({roster.length})</h3>
          {roster.length === 0 ? (
            <p className="roster-empty">No mobile experts in roster. Add some above.</p>
          ) : (
            <ul>
              {roster.map((name) => (
                <li key={name}>
                  <span>{name}</span>
                  <button
                    className="roster-remove"
                    onClick={() => handleRemoveMobileExpert(name)}
                    disabled={saving}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="roster-hint">
          Roster is stored in Google Sheets. Mobile experts can select their name when uploading photos.
        </p>
      </div>
    </Layout>
  );
}
