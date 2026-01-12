import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStoreMetricsByName } from '../services/sheetsService';
import { getRepStatsByStore, getFirestoreSubmissionCount } from '../services/submissionsService';
import type { StoreMetrics, RepStats } from '../types';
import { Layout, KpiCard, DataTable, Loading } from '../components';
import type { Column } from '../components';
import './Reporting.css';

export function Reporting() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [repStats, setRepStats] = useState<RepStats[]>([]);
  const [firestoreCount, setFirestoreCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile?.storeName) return;

    setLoading(true);
    setError('');

    try {
      // Load metrics from CSV
      const storeMetrics = await getStoreMetricsByName(profile.storeName);
      setMetrics(storeMetrics);

      // Load rep stats from Firestore
      const stats = await getRepStatsByStore(profile.storeName);
      setRepStats(stats);

      // Load Firestore submission count
      const count = await getFirestoreSubmissionCount(profile.storeName);
      setFirestoreCount(count);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<RepStats>[] = [
    { key: 'repName', header: 'Rep Name' },
    { key: 'submissions', header: 'Submissions', align: 'center' },
    {
      key: 'percentOfStore',
      header: '% of Store',
      align: 'right',
      render: (item) => `${item.percentOfStore.toFixed(1)}%`,
    },
  ];

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

        <h2 className="reporting-section-title">{profile?.storeName}</h2>

        {/* KPI Cards */}
        <div className="reporting-kpis">
          <KpiCard
            title="Total Submissions"
            value={metrics?.submissions ?? 0}
            subtitle="From Google Sheet"
            color="blue"
          />
          <KpiCard
            title="Traffic"
            value={metrics?.traffic ?? 0}
            subtitle="Customer count"
            color="green"
          />
          <KpiCard
            title="Submissions / 100"
            value={metrics?.submissionsPer100?.toFixed(2) ?? '0.00'}
            subtitle="Performance rate"
            color="orange"
          />
        </div>

        {/* Firestore comparison */}
        <div className="reporting-comparison">
          <KpiCard
            title="Firestore Submissions"
            value={firestoreCount}
            subtitle="App submissions count"
            color="purple"
          />
        </div>

        {/* Rep Performance Table */}
        <div className="reporting-section">
          <h3 className="reporting-section-subtitle">Rep Performance</h3>
          {repStats.length === 0 ? (
            <p className="reporting-empty">No rep submissions recorded yet</p>
          ) : (
            <DataTable
              columns={columns}
              data={repStats}
              emptyMessage="No rep data available"
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
