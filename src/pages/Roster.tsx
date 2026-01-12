import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoreRoster, clearCache } from '../services/sheetsService';
import { APPS_SCRIPT_URL } from '../config';
import { Layout, Button } from '../components';
import './Roster.css';

const LOCAL_ROSTER_KEY = 'traffic_sm_roster_';

export function Roster() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [roster, setRoster] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const storeName = session?.storeName || '';

  useEffect(() => {
    if (session?.role !== 'store') {
      navigate('/');
      return;
    }
    loadRoster();
  }, [session, navigate]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      // First check localStorage for local edits
      const localRoster = localStorage.getItem(LOCAL_ROSTER_KEY + storeName);
      if (localRoster) {
        setRoster(JSON.parse(localRoster));
      } else {
        // Otherwise load from sheet
        const sheetRoster = await getStoreRoster(storeName);
        setRoster(sheetRoster);
      }
    } catch (err) {
      console.error('Error loading roster:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveRoster = (newRoster: string[]) => {
    // Save to localStorage immediately
    localStorage.setItem(LOCAL_ROSTER_KEY + storeName, JSON.stringify(newRoster));
    setRoster(newRoster);
    clearCache();

    // If Apps Script URL is configured, sync to Google Sheet
    if (APPS_SCRIPT_URL) {
      syncToSheet(newRoster);
    }
  };

  const syncToSheet = async (rosterData: string[]) => {
    setSaving(true);
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateRoster',
          storeName,
          roster: rosterData,
        }),
      });
      setMessage('Roster synced to sheet');
    } catch (err) {
      console.error('Error syncing to sheet:', err);
      setMessage('Saved locally (sheet sync failed)');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleAddRep = () => {
    const name = newName.trim();
    if (!name) return;
    if (roster.includes(name)) {
      setMessage('Name already exists');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const newRoster = [...roster, name].sort();
    saveRoster(newRoster);
    setNewName('');
    setMessage('Rep added');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleRemoveRep = (name: string) => {
    if (confirm(`Remove "${name}" from roster?`)) {
      const newRoster = roster.filter((r) => r !== name);
      saveRoster(newRoster);
      setMessage('Rep removed');
      setTimeout(() => setMessage(''), 2000);
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

        {message && <div className="roster-message">{message}</div>}

        {/* Add new rep */}
        <div className="roster-add">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter rep name"
            onKeyDown={(e) => e.key === 'Enter' && handleAddRep()}
          />
          <Button onClick={handleAddRep} disabled={!newName.trim() || saving}>
            Add Rep
          </Button>
        </div>

        {/* Roster list */}
        <div className="roster-list">
          <h3>Current Roster ({roster.length})</h3>
          {roster.length === 0 ? (
            <p className="roster-empty">No reps in roster. Add some above.</p>
          ) : (
            <ul>
              {roster.map((name) => (
                <li key={name}>
                  <span>{name}</span>
                  <button
                    className="roster-remove"
                    onClick={() => handleRemoveRep(name)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="roster-hint">
          Changes are saved locally and will sync to the Google Sheet if configured.
        </p>
      </div>
    </Layout>
  );
}
