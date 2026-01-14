import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoreRoster, clearCache } from '../services/sheetsService';
import { Layout, Button } from '../components';
import './Roster.css';

export function Roster() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roster, setRoster] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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

        <div className="roster-instructions">
          <p><strong>To add/remove mobile experts:</strong></p>
          <ol>
            <li>Open your Google Sheet</li>
            <li>Go to the "Roster" tab</li>
            <li>Add a row with: <code>{storeName}</code> in column A, name in column B</li>
            <li>Click "Refresh" below to see changes</li>
          </ol>
        </div>

        <Button onClick={handleRefresh} variant="secondary">
          Refresh Roster
        </Button>

        {/* Roster list */}
        <div className="roster-list">
          <h3>Mobile Experts ({roster.length})</h3>
          {roster.length === 0 ? (
            <p className="roster-empty">No mobile experts in roster yet. Add them in Google Sheets.</p>
          ) : (
            <ul>
              {roster.map((name) => (
                <li key={name}>
                  <span>{name}</span>
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
