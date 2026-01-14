import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMetricsSortedByPerformance, getTrafficDataDate, calculateMonthlyGoal } from '../services/sheetsService';
import type { StoreMetrics } from '../types';
import { Layout, KpiCard, DataTable, Loading } from '../components';
import type { Column } from '../components';
import './DistrictOverview.css';

export function DistrictOverview() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreMetrics[]>([]);
  const [districtTotals, setDistrictTotals] = useState<StoreMetrics | null>(null);
  const [trafficDataDate, setTrafficDataDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const district = session?.district || 'West';

  useEffect(() => {
    // Redirect if not DM
    if (session && session.role !== 'dm') {
      navigate('/');
      return;
    }

    loadData();
  }, [session, navigate, district]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load all store metrics sorted by performance
      const storeMetrics = await getMetricsSortedByPerformance();
      const filteredStores = storeMetrics.filter((store) => store.district === district);
      setStores(filteredStores);

      if (filteredStores.length > 0) {
        const submissions = filteredStores.reduce((sum, store) => sum + store.submissions, 0);
        const traffic = filteredStores.reduce((sum, store) => sum + store.traffic, 0);
        const submissionsPer100 = traffic > 0
          ? Math.round((submissions / traffic) * 100 * 100) / 100
          : 0;

        setDistrictTotals({
          storeName: 'District Total',
          district,
          submissions,
          traffic,
          submissionsPer100,
        });
      } else {
        setDistrictTotals(null);
      }

      // Load traffic data date
      const dataDate = await getTrafficDataDate();
      setTrafficDataDate(dataDate);
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

  const columns: Column<StoreMetrics & { rank: number; goal: number }>[] = [
    {
      key: 'rank',
      header: '#',
      align: 'center',
      render: (item) => <span className="rank-badge">{item.rank}</span>,
    },
    { key: 'storeName', header: 'Store' },
    { key: 'submissions', header: 'Subs', align: 'center' },
    {
      key: 'goal',
      header: 'Goal',
      align: 'center',
      render: (item) => <span className="goal-value">{item.goal}</span>,
    },
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

  // Add rank and goal to stores
  const rankedStores = stores.map((store, index) => ({
    ...store,
    rank: index + 1,
    goal: calculateMonthlyGoal(store.traffic, trafficDataDate),
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
                title="Submissions"
                value={districtTotals.submissions}
                color="blue"
              />
              <KpiCard
                title="Goal"
                value={calculateMonthlyGoal(districtTotals.traffic, trafficDataDate)}
                subtitle="3 per 100 trend"
                color="purple"
              />
              <KpiCard
                title="Traffic"
                value={districtTotals.traffic}
                subtitle={trafficDataDate ? `Through ${trafficDataDate}` : undefined}
                color="green"
              />
              <KpiCard
                title="Per 100"
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
