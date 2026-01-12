import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getSubmissionsByStore,
  getAllSubmissions,
  getFilteredSubmissions,
} from '../services/submissionsService';
import { fetchStoreMetrics } from '../services/sheetsService';
import type { Submission } from '../types';
import { Layout, PhotoGrid, Loading } from '../components';
import './DownloadPhotos.css';

export function DownloadPhotos() {
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [repNameFilter, setRepNameFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isDM = profile?.role === 'dm';

  useEffect(() => {
    loadInitialData();
  }, [profile]);

  const loadInitialData = async () => {
    if (!profile) return;

    setLoading(true);
    setError('');

    try {
      // Load store list for DM dropdown
      if (isDM) {
        const metrics = await fetchStoreMetrics();
        setStores(metrics.map((m) => m.storeName));
      }

      // Load submissions
      if (isDM) {
        const allSubmissions = await getAllSubmissions();
        setSubmissions(allSubmissions);
      } else {
        const storeSubmissions = await getSubmissionsByStore(profile.storeName);
        setSubmissions(storeSubmissions);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    if (!profile) return;

    setLoading(true);
    setError('');

    try {
      let filtered: Submission[];

      if (isDM) {
        filtered = await getFilteredSubmissions(
          selectedStore || undefined,
          repNameFilter || undefined,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
      } else {
        filtered = await getFilteredSubmissions(
          profile.storeName,
          repNameFilter || undefined,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
      }

      setSubmissions(filtered);
    } catch (err: any) {
      console.error('Error filtering:', err);
      setError('Failed to filter photos');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedStore('');
    setRepNameFilter('');
    setStartDate('');
    setEndDate('');
    loadInitialData();
  };

  return (
    <Layout title="Download Photos" showBack>
      <div className="download-page">
        {/* Filters */}
        <div className="download-filters">
          <h3 className="download-filters__title">Filters</h3>

          <div className="download-filters__grid">
            {isDM && (
              <div className="download-filters__field">
                <label>Store</label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                >
                  <option value="">All Stores</option>
                  {stores.map((store) => (
                    <option key={store} value={store}>
                      {store}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="download-filters__field">
              <label>Rep Name</label>
              <input
                type="text"
                value={repNameFilter}
                onChange={(e) => setRepNameFilter(e.target.value)}
                placeholder="Search by rep name"
              />
            </div>

            <div className="download-filters__field">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="download-filters__field">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="download-filters__actions">
            <button
              className="download-filters__btn download-filters__btn--primary"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </button>
            <button
              className="download-filters__btn download-filters__btn--secondary"
              onClick={handleClearFilters}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Content */}
        {error && <div className="download-error">{error}</div>}

        {loading ? (
          <Loading message="Loading photos..." />
        ) : (
          <>
            <p className="download-count">
              {submissions.length} photo{submissions.length !== 1 ? 's' : ''} found
            </p>
            <PhotoGrid
              submissions={submissions}
              showStoreName={isDM}
              emptyMessage="No photos found matching your filters"
            />
          </>
        )}
      </div>
    </Layout>
  );
}
