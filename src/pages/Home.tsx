import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMobileExpertStats, getStoreList } from '../services/sheetsService';
import type { MobileExpertStats } from '../services/sheetsService';
import { Layout, Button } from '../components';
import './Home.css';

export function Home() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [expertStats, setExpertStats] = useState<MobileExpertStats[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [loadingStats, setLoadingStats] = useState(false);

  const isDM = session?.role === 'dm';
  const isStore = session?.role === 'store';
  const isMobileExpert = session?.role === 'mobile_expert';

  const storeList = getStoreList();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  useEffect(() => {
    if (isDM) {
      loadExpertStats();
    }
  }, [isDM, selectedStore]);

  const loadExpertStats = async () => {
    setLoadingStats(true);
    try {
      const stats = await getMobileExpertStats(selectedStore || '', true);
      setExpertStats(stats);
    } catch (err) {
      console.error('Error loading expert stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <Layout title="Home">
      <div className="home">
        <div className="home__welcome">
          <h2>
            {isDM && 'District Manager'}
            {isStore && `${session?.storeName}`}
            {isMobileExpert && `${session?.storeName} - ${session?.mobileExpertName}`}
          </h2>
          {isDM && <p className="home__role-badge">DM Access</p>}
          {isStore && <p className="home__role-badge">Store Manager</p>}
          {isMobileExpert && <p className="home__role-badge">Mobile Expert</p>}
        </div>

        <div className="home__actions">
          {isMobileExpert && (
            <Button
              variant="large"
              fullWidth
              onClick={() => navigate('/upload')}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              }
            >
              Upload Photo
            </Button>
          )}

          {(isStore || isDM) && (
            <>
              <Button
                variant="large"
                fullWidth
                onClick={() => navigate('/photos')}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                }
              >
                Download Photos
              </Button>

              <Button
                variant="large"
                fullWidth
                onClick={() => navigate('/reporting')}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 20V10" />
                    <path d="M12 20V4" />
                    <path d="M6 20v-6" />
                  </svg>
                }
              >
                Reporting
              </Button>
            </>
          )}

          {isStore && (
            <Button
              variant="large"
              fullWidth
              onClick={() => navigate('/roster')}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            >
              Manage Roster
            </Button>
          )}

          {isDM && (
            <>
              <Button
                variant="large"
                fullWidth
                onClick={() => navigate('/district')}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                }
              >
                District Overview
              </Button>

              <Button
                variant="large"
                fullWidth
                onClick={() => navigate('/passwords')}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                }
              >
                Reset Store Passwords
              </Button>
            </>
          )}
        </div>

        {/* Mobile Expert Upload Stats - DM only */}
        {isDM && (
          <div className="home__experts">
            <div className="home__experts-header">
              <h3 className="home__experts-title">
                Mobile Expert Uploads - {currentMonth}
              </h3>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="home__experts-filter"
              >
                <option value="">All Stores</option>
                {storeList.map((store) => (
                  <option key={store} value={store}>
                    {store}
                  </option>
                ))}
              </select>
            </div>

            {loadingStats ? (
              <p className="home__experts-loading">Loading stats...</p>
            ) : expertStats.length === 0 ? (
              <p className="home__experts-empty">
                No uploads this month{selectedStore ? ` for ${selectedStore}` : ''}.
              </p>
            ) : (
              <div className="home__experts-list">
                {expertStats.map((stat, index) => (
                  <div key={`${stat.storeName}-${stat.mobileExpert}-${index}`} className="home__expert-row">
                    <div className="home__expert-info">
                      <span className="home__expert-name">{stat.mobileExpert}</span>
                      {!selectedStore && (
                        <span className="home__expert-store">{stat.storeName}</span>
                      )}
                    </div>
                    <span className="home__expert-count">
                      {stat.uploadCount} upload{stat.uploadCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="home__experts-total">
              Total: {expertStats.reduce((sum, s) => sum + s.uploadCount, 0)} uploads from {expertStats.length} mobile expert{expertStats.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
