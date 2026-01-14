import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStoreMetricsByName, getMobileExpertStats, getStoreRoster, fetchStoreList, getTrafficDataDate, calculateMonthlyGoal } from '../services/sheetsService';
import type { StoreMetrics } from '../types';
import type { MobileExpertStats } from '../services/sheetsService';
import { Layout, KpiCard, Loading } from '../components';
import './Reporting.css';

export function Reporting() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [expertStats, setExpertStats] = useState<MobileExpertStats[]>([]);
  const [roster, setRoster] = useState<string[]>([]);
  const [trafficDataDate, setTrafficDataDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [storeList, setStoreList] = useState<string[]>([]);
  const [storeListLoading, setStoreListLoading] = useState(false);

  const isDM = session?.role === 'dm';
  const storeName = session?.storeName || '';
  const district = session?.district || 'West';

  // For DM, use selected store filter; for store manager, use their store
  const activeStore = isDM ? selectedStore : storeName;

  useEffect(() => {
    loadData();
  }, [storeName, selectedStore, isDM]);

  useEffect(() => {
    if (isDM) {
      loadStoreList();
    }
  }, [isDM, district]);

  const loadStoreList = async () => {
    setStoreListLoading(true);
    try {
      const stores = await fetchStoreList(district);
      setStoreList(stores);
    } catch (err) {
      console.error('Error loading store list:', err);
      setStoreList([]);
    } finally {
      setStoreListLoading(false);
    }
  };

  const loadData = async () => {
    // Store managers need a store name, DM can view all or filtered
    if (!isDM && !storeName) return;

    setLoading(true);
    setError('');

    try {
      // Load traffic data date
      const dataDate = await getTrafficDataDate();
      setTrafficDataDate(dataDate);

      // Load store metrics (only if a specific store is selected)
      if (activeStore) {
        const storeMetrics = await getStoreMetricsByName(activeStore);
        setMetrics(storeMetrics);

        // Load roster for specific store
        const storeRoster = await getStoreRoster(activeStore);
        setRoster(storeRoster);
      } else {
        setMetrics(null);
        setRoster([]);
      }

      // Load mobile expert upload stats for current month
      // For DM with no filter, shows all stores; otherwise filtered by activeStore
      const stats = await getMobileExpertStats(activeStore || '', true, district);
      setExpertStats(stats);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  };

  // Combine roster with stats to show all mobile experts
  const getExpertUploadCount = (expertName: string): number => {
    const stat = expertStats.find((s) => s.mobileExpert === expertName);
    return stat?.uploadCount || 0;
  };

  // Get current month name
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  if (loading) {
    return (
      <Layout title="Reporting" showBack>
        <Loading message="Loading report..." />
      </Layout>
    );
  }

  return (
    <Layout title="Reporting" showBack>
      <div className="reporting-page">
        {error && <div className="reporting-error">{error}</div>}

        {/* DM Store Filter */}
        {isDM && (
          <div className="reporting-filter">
            <label htmlFor="store-filter">Filter by Store:</label>
            <select
              id="store-filter"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="reporting-filter__select"
              disabled={storeListLoading}
            >
              <option value="">
                {storeListLoading ? 'Loading stores...' : 'All Stores'}
              </option>
              {storeList.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Store Title - show for store managers or when DM selects a store */}
        {activeStore && (
          <h2 className="reporting-section-title">{activeStore}</h2>
        )}

        {/* KPIs - only show when a specific store is selected */}
        {activeStore && metrics ? (
          <div className="reporting-kpis">
            <KpiCard
              title="Submissions"
              value={metrics.submissions}
              color="blue"
            />
            <KpiCard
              title="Goal"
              value={calculateMonthlyGoal(metrics.traffic, trafficDataDate)}
              subtitle="3 per 100 trend"
              color="purple"
            />
            <KpiCard
              title="Traffic"
              value={metrics.traffic}
              subtitle={trafficDataDate ? `Through ${trafficDataDate}` : 'Customer count'}
              color="green"
            />
            <KpiCard
              title="Per 100"
              value={metrics.submissionsPer100.toFixed(2)}
              color="orange"
            />
            <KpiCard
              title="ME Goal"
              value={roster.length > 0 ? Math.round(calculateMonthlyGoal(metrics.traffic, trafficDataDate) / roster.length) : 0}
              subtitle={`Per ME (${roster.length} ${roster.length === 1 ? 'ME' : 'MEs'})`}
              color="magenta"
            />
          </div>
        ) : activeStore ? (
          <div className="reporting-empty">
            No data found for {activeStore}
          </div>
        ) : null}

        {/* Mobile Expert Upload Stats */}
        <div className="reporting-experts">
          <h3 className="reporting-experts__title">
            Mobile Expert Uploads - {currentMonth}
          </h3>

          {/* For store managers or DM with store selected: show roster-based list */}
          {activeStore && roster.length > 0 ? (
            <div className="reporting-experts__list">
              {roster.map((expert) => (
                <div key={expert} className="reporting-expert-row">
                  <span className="reporting-expert-row__name">{expert}</span>
                  <span className="reporting-expert-row__count">
                    {getExpertUploadCount(expert)} upload{getExpertUploadCount(expert) !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : activeStore && roster.length === 0 ? (
            <p className="reporting-experts__empty">
              No mobile experts in roster. Add them in the Roster page.
            </p>
          ) : /* DM viewing all stores */ expertStats.length === 0 ? (
            <p className="reporting-experts__empty">
              No uploads this month.
            </p>
          ) : (
            <div className="reporting-experts__list">
              {expertStats.map((stat, index) => (
                <div key={`${stat.storeName}-${stat.mobileExpert}-${index}`} className="reporting-expert-row">
                  <div className="reporting-expert-row__info">
                    <span className="reporting-expert-row__name">{stat.mobileExpert}</span>
                    <span className="reporting-expert-row__store">{stat.storeName}</span>
                  </div>
                  <span className="reporting-expert-row__count">
                    {stat.uploadCount} upload{stat.uploadCount !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="reporting-experts__total">
            Total uploads this month: {expertStats.reduce((sum, s) => sum + s.uploadCount, 0)}
          </p>
        </div>
      </div>
    </Layout>
  );
}
