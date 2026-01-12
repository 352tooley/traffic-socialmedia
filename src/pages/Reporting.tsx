import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStoreMetricsByName } from '../services/sheetsService';
import type { StoreMetrics } from '../types';
import { Layout, KpiCard, Loading } from '../components';
import './Reporting.css';

export function Reporting() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const storeName = session?.storeName || '';

  useEffect(() => {
    loadData();
  }, [storeName]);

  const loadData = async () => {
    if (!storeName) return;

    setLoading(true);
    setError('');

    try {
      const storeMetrics = await getStoreMetricsByName(storeName);
      setMetrics(storeMetrics);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  };

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

        <h2 className="reporting-section-title">{storeName}</h2>

        {metrics ? (
          <div className="reporting-kpis">
            <KpiCard
              title="Total Submissions"
              value={metrics.submissions}
              subtitle="From Google Sheet"
              color="blue"
            />
            <KpiCard
              title="Traffic"
              value={metrics.traffic}
              subtitle="Customer count"
              color="green"
            />
            <KpiCard
              title="Submissions / 100"
              value={metrics.submissionsPer100.toFixed(2)}
              subtitle="Performance rate"
              color="orange"
            />
          </div>
        ) : (
          <div className="reporting-empty">
            No data found for {storeName}
          </div>
        )}
      </div>
    </Layout>
  );
}
