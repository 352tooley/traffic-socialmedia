import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout, Button } from '../components';
import './Home.css';

export function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isDM = profile?.role === 'dm';

  return (
    <Layout title="Home">
      <div className="home">
        <div className="home__welcome">
          <h2>Welcome{profile?.storeName ? `, ${profile.storeName}` : ''}</h2>
          {isDM && <p className="home__role-badge">District Manager</p>}
        </div>

        <div className="home__actions">
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

          {isDM && (
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
          )}
        </div>
      </div>
    </Layout>
  );
}
