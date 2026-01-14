import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoreMetricsByName, getStoreRoster, getMobileExpertStats, getTrafficDataDate, calculateMonthlyGoal } from '../services/sheetsService';
import { Layout, Button } from '../components';
import './Home.css';

export function Home() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const isDM = session?.role === 'dm';
  const isStore = session?.role === 'store';
  const isMobileExpert = session?.role === 'mobile_expert';
  const district = session?.district || 'West';

  // Goal tracking state for Mobile Experts
  const [individualGoal, setIndividualGoal] = useState<number>(0);
  const [currentUploads, setCurrentUploads] = useState<number>(0);
  const [loadingGoal, setLoadingGoal] = useState(true);

  const storeName = session?.storeName || '';
  const mobileExpertName = session?.mobileExpertName || '';

  // Load goal data for Mobile Experts
  useEffect(() => {
    if (isMobileExpert && storeName && mobileExpertName) {
      loadGoalData();
    }
  }, [isMobileExpert, storeName, mobileExpertName]);

  const loadGoalData = async () => {
    setLoadingGoal(true);
    try {
      // Get store metrics and roster in parallel
      const [metrics, roster, expertStats, trafficDataDate] = await Promise.all([
        getStoreMetricsByName(storeName),
        getStoreRoster(storeName),
        getMobileExpertStats(storeName, true, district), // current month only
        getTrafficDataDate()
      ]);

      // Only calculate if we have metrics
      if (metrics) {
        // Calculate store goal
        const storeGoal = calculateMonthlyGoal(metrics.traffic, trafficDataDate);

        // Calculate individual goal (store goal / number of MEs)
        const rosterCount = roster.length;
        const myGoal = rosterCount > 0 ? Math.round(storeGoal / rosterCount) : 0;
        setIndividualGoal(myGoal);

        // Get current upload count for this ME
        const myStats = expertStats.find(s => s.mobileExpert === mobileExpertName);
        setCurrentUploads(myStats?.uploadCount || 0);
      }
    } catch (err) {
      console.error('Error loading goal data:', err);
    } finally {
      setLoadingGoal(false);
    }
  };

  return (
    <Layout title="Home">
      <div className="home">
        <div className="home__welcome">
          <h2>
            {isDM && `District Manager - ${district}`}
            {isStore && `${session?.storeName}`}
            {isMobileExpert && `${session?.storeName} - ${session?.mobileExpertName}`}
          </h2>
          {isDM && <p className="home__role-badge">DM Access</p>}
          {isStore && <p className="home__role-badge">Store Manager</p>}
          {isMobileExpert && <p className="home__role-badge">Mobile Expert</p>}
        </div>

        <div className="home__actions">
          {isMobileExpert && (
            <>
              {/* Goal Progress */}
              {!loadingGoal && individualGoal > 0 && (
                <div className="home__goal">
                  <div className="home__goal-header">
                    <h3>Your Monthly Goal</h3>
                  </div>
                  <div className="home__goal-stats">
                    <div className="home__goal-stat">
                      <div className="home__goal-label">Current Uploads</div>
                      <div className="home__goal-value home__goal-value--current">{currentUploads}</div>
                    </div>
                    <div className="home__goal-divider">/</div>
                    <div className="home__goal-stat">
                      <div className="home__goal-label">Goal</div>
                      <div className="home__goal-value home__goal-value--goal">{individualGoal}</div>
                    </div>
                  </div>
                  <div className="home__goal-progress-bar">
                    <div 
                      className="home__goal-progress-fill"
                      style={{ 
                        width: `${Math.min((currentUploads / individualGoal) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <div className="home__goal-attainment">
                    {currentUploads >= individualGoal ? (
                      <span className="home__goal-attainment--complete">
                        🎉 Goal Achieved! {Math.round((currentUploads / individualGoal) * 100)}%
                      </span>
                    ) : (
                      <span className="home__goal-attainment--progress">
                        {Math.round((currentUploads / individualGoal) * 100)}% Complete
                      </span>
                    )}
                  </div>
                </div>
              )}

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
            </>
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

              {isDM && (
                <Button
                  variant="large"
                  fullWidth
                  onClick={() => navigate('/approvals')}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  }
                >
                  Photo Approvals
                </Button>
              )}
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
                onClick={() => navigate('/district-modify')}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                }
              >
                Modify District
              </Button>

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
      </div>
    </Layout>
  );
}
