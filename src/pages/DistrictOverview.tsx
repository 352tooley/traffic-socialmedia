import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMetricsSortedByPerformance, getDistrictTotals, getMobileExpertStats, getStoreList } from '../services/sheetsService';
import type { StoreMetrics } from '../types';
import type { MobileExpertStats } from '../services/sheetsService';
import { Layout, KpiCard, DataTable, Loading } from '../components';
import type { Column } from '../components';
import './DistrictOverview.css';

export function DistrictOverview() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreMetrics[]>([]);
  const [districtTotals, setDistrictTotals] = useState<StoreMetrics | null>(null);
  const [expertStats, setExpertStats] = useState<MobileExpertStats[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const storeList = getStoreList();

  useEffect(() => {
    // Redirect if not DM
    if (session && session.role !== 'dm') {
      navigate('/');
      return;
    }

    loadData();
  }, [session, navigate]);

  useEffect(() => {
    loadExpertStats();
  }, [selectedStore]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load all store metrics sorted by performance
      const storeMetrics = await getMetricsSortedByPerformance();
      setStores(storeMetrics);

      // Load district totals
      const totals = await getDistrictTotals();
      setDistrictTotals(totals);

      // Load mobile expert stats (all stores initially)
      const stats = await getMobileExpertStats('', true);
      setExpertStats(stats);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load district data');
    } finally {
      setLoading(false);
    }
  };

  const loadExpertStats = async () => {
    try {
      const stats = await getMobileExpertStats(selectedStore || '', true);
      setExpertStats(stats);
    } catch (err) {
      console.error('Error loading expert stats:', err);
    }
  };

  const handleStoreClick = (store: StoreMetrics) => {
    navigate(`/store/${encodeURIComponent(store.storeName)}`);
  };

  const columns: Column<StoreMetrics & { rank: number }>[] = [
    {
      key: 'rank',
      header: '#',
      align: 'center',
      render: (item) => <span className="rank-badge">{item.rank}</span>,
    },
    { key: 'storeName', header: 'Store' },
    { key: 'submissions', header: 'Submissions', align: 'center' },
    { key: 'traffic', header: 'Traffic', align: 'center' },
    {
      key: 'submissionsPer100',
      header: 'Per 100',
      align: 'right',
      render: (item) => (
        <span className="per100-value">{item.submissionsPer100.toFixed(2)}</span>
      ),
    },
  ];

  // Add rank to stores
  const rankedStores = stores.map((store, index) => ({
    ...store,
    rank: index + 1,
  }));

  // Get current month name
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  if (loading) {
    return (
      <Layout title="District Overview" showBack>
        <Loading message="Loading district data..." />
      </Layout>
    );
  }

  return (
    <Layout title="District Overview" showBack>
      <div className="district-page">
        {error && <div className="district-error">{error}</div>}

        {/* District Totals */}
        {districtTotals && (
          <div className="district-totals">
            <h2 className="district-section-title">District Totals</h2>
            <div className="district-kpis">
              <KpiCard
                title="Total Submissions"
                value={districtTotals.submissions}
                color="blue"
              />
              <KpiCard
                title="Total Traffic"
                value={districtTotals.traffic}
                color="green"
              />
              <KpiCard
                title="District Per 100"
                value={districtTotals.submissionsPer100.toFixed(2)}
                color="orange"
              />
            </div>
          </div>
        )}

        {/* Mobile Expert Upload Stats */}
        <div className="district-experts">
          <div className="district-experts__header">
            <h2 className="district-section-title">
              Mobile Expert Uploads - {currentMonth}
            </h2>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="district-experts__filter"
            >
              <option value="">All Stores</option>
              {storeList.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>

          {expertStats.length === 0 ? (
            <p className="district-experts__empty">
              No uploads this month{selectedStore ? ` for ${selectedStore}` : ''}.
            </p>
          ) : (
            <div className="district-experts__list">
              {expertStats.map((stat, index) => (
                <div key={`${stat.storeName}-${stat.mobileExpert}-${index}`} className="district-expert-row">
                  <div className="district-expert-row__info">
                    <span className="district-expert-row__name">{stat.mobileExpert}</span>
                    {!selectedStore && (
                      <span className="district-expert-row__store">{stat.storeName}</span>
                    )}
                  </div>
                  <span className="district-expert-row__count">
                    {stat.uploadCount} upload{stat.uploadCount !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="district-experts__total">
            Total: {expertStats.reduce((sum, s) => sum + s.uploadCount, 0)} uploads from {expertStats.length} mobile expert{expertStats.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Store Rankings */}
        <div className="district-rankings">
          <h2 className="district-section-title">Store Rankings</h2>
          <p className="district-subtitle">
            Ranked by submissions per 100 traffic (highest to lowest)
          </p>
          <DataTable
            columns={columns}
            data={rankedStores}
            onRowClick={handleStoreClick}
            emptyMessage="No store data available"
            highlightRow={(item) => item.rank <= 3}
          />
        </div>
      </div>
    </Layout>
  );
}
