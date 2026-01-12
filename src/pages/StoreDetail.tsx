import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStoreMetricsByName } from '../services/sheetsService';
import {
  getRepStatsByStore,
  getFirestoreSubmissionCount,
  getSubmissionsByStore,
} from '../services/submissionsService';
import type { StoreMetrics, RepStats, Submission } from '../types';
import { Layout, KpiCard, DataTable, PhotoGrid, Loading } from '../components';
import type { Column } from '../components';
import './StoreDetail.css';

export function StoreDetail() {
  const { storeName } = useParams<{ storeName: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [repStats, setRepStats] = useState<RepStats[]>([]);
  const [firestoreCount, setFirestoreCount] = useState(0);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'stats' | 'photos'>('stats');

  const decodedStoreName = storeName ? decodeURIComponent(storeName) : '';

  useEffect(() => {
    // Only DM can view store details
    if (profile && profile.role !== 'dm') {
      navigate('/');
      return;
    }

    if (decodedStoreName) {
      loadData();
    }
  }, [profile, decodedStoreName, navigate]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Load metrics from CSV
      const storeMetrics = await getStoreMetricsByName(decodedStoreName);
      setMetrics(storeMetrics);

      // Load rep stats from Firestore
      const stats = await getRepStatsByStore(decodedStoreName);
      setRepStats(stats);

      // Load Firestore submission count
      const count = await getFirestoreSubmissionCount(decodedStoreName);
      setFirestoreCount(count);

      // Load submissions for photo feed
      const subs = await getSubmissionsByStore(decodedStoreName);
      setSubmissions(subs);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load store data');
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
          <KpiCard
            title="Firestore Submissions"
            value={firestoreCount}
            subtitle="App submissions"
            color="purple"
          />
        </div>

        {/* Tabs */}
        <div className="store-detail-tabs">
          <button
            className={`store-detail-tab ${activeTab === 'stats' ? 'store-detail-tab--active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Rep Performance
          </button>
          <button
            className={`store-detail-tab ${activeTab === 'photos' ? 'store-detail-tab--active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            Photos ({submissions.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'stats' ? (
          <div className="store-detail-section">
            {repStats.length === 0 ? (
              <p className="store-detail-empty">No rep submissions recorded yet</p>
            ) : (
              <DataTable
                columns={columns}
                data={repStats}
                emptyMessage="No rep data available"
              />
            )}
          </div>
        ) : (
          <div className="store-detail-section">
            <PhotoGrid
              submissions={submissions}
              showStoreName={false}
              emptyMessage="No photos uploaded for this store"
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
