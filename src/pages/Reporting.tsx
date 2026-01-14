import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStoreMetricsByName, getMobileExpertStats, getStoreRoster } from '../services/sheetsService';
import type { StoreMetrics } from '../types';
import type { MobileExpertStats } from '../services/sheetsService';
import { Layout, KpiCard, Loading } from '../components';
import './Reporting.css';

export function Reporting() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [expertStats, setExpertStats] = useState<MobileExpertStats[]>([]);
  const [roster, setRoster] = useState<string[]>([]);
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
      // Load store metrics
      const storeMetrics = await getStoreMetricsByName(storeName);
      setMetrics(storeMetrics);

      // Load mobile expert upload stats for current month
      const stats = await getMobileExpertStats(storeName, true);
      setExpertStats(stats);

      // Load roster to show all mobile experts (even those with 0 uploads)
      const storeRoster = await getStoreRoster(storeName);
      setRoster(storeRoster);
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

        {/* Mobile Expert Upload Stats */}
        <div className="reporting-experts">
          <h3 className="reporting-experts__title">
            Mobile Expert Uploads - {currentMonth}
          </h3>

          {roster.length === 0 ? (
            <p className="reporting-experts__empty">
              No mobile experts in roster. Add them in the Roster page.
            </p>
          ) : (
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
          )}

          <p className="reporting-experts__total">
            Total uploads this month: {expertStats.reduce((sum, s) => sum + s.uploadCount, 0)}
          </p>
        </div>
      </div>
    </Layout>
  );
}
