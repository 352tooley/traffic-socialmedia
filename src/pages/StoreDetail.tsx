import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoreMetricsByName, getStoreRoster, fetchStoreList } from '../services/sheetsService';
import type { StoreMetrics } from '../types';
import { Layout, KpiCard, Loading } from '../components';
import './StoreDetail.css';

export function StoreDetail() {
  const { storeName } = useParams<{ storeName: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [roster, setRoster] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const district = session?.district || 'West';

  const decodedStoreName = storeName ? decodeURIComponent(storeName) : '';

  useEffect(() => {
    // Only DM can view store details
    if (session && session.role !== 'dm') {
      navigate('/');
      return;
    }

    if (decodedStoreName) {
      loadData();
    }
  }, [session, decodedStoreName, navigate, district]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const districtStores = await fetchStoreList(district);
      if (!districtStores.includes(decodedStoreName)) {
        navigate('/');
        return;
      }

      // Load metrics from CSV
      const storeMetrics = await getStoreMetricsByName(decodedStoreName);
      setMetrics(storeMetrics);

      // Load roster
      const storeRoster = await getStoreRoster(decodedStoreName);
      setRoster(storeRoster);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load store data');
    } finally {
      setLoading(false);
    }
  };

  const handleManageRoster = () => {
    navigate(`/roster?store=${encodeURIComponent(decodedStoreName)}`);
  };

  if (loading) {
    return (
      <Layout title={decodedStoreName || 'Store Detail'} showBack>
        <Loading message="Loading store data..." />
      </Layout>
    );
  }

  return (
    <Layout title={decodedStoreName || 'Store Detail'} showBack>
      <div className="store-detail-page">
        {error && <div className="store-detail-error">{error}</div>}

        {/* KPI Cards */}
        <div className="store-detail-kpis">
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

        {/* Roster Section */}
        <div className="store-detail-section">
          <div className="store-detail-section-header">
            <h2>Mobile Experts</h2>
            <button className="store-detail-manage-btn" onClick={handleManageRoster}>
              Manage Roster
            </button>
          </div>
          {roster.length === 0 ? (
            <p className="store-detail-empty">No mobile experts on roster yet</p>
          ) : (
            <ul className="store-detail-roster">
              {roster.map((name, index) => (
                <li key={index} className="store-detail-roster-item">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
