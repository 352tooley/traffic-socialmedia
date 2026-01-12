import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMetricsSortedByPerformance, getDistrictTotals } from '../services/sheetsService';
import type { StoreMetrics } from '../types';
import { Layout, KpiCard, DataTable, Loading } from '../components';
import type { Column } from '../components';
import './DistrictOverview.css';

export function DistrictOverview() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreMetrics[]>([]);
  const [districtTotals, setDistrictTotals] = useState<StoreMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect if not DM
    if (profile && profile.role !== 'dm') {
      navigate('/');
      return;
    }

    loadData();
  }, [profile, navigate]);

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
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load district data');
    } finally {
      setLoading(false);
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
