import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPhotos } from '../services/sheetsService';
import type { Photo } from '../types';
import { Layout, Button } from '../components';
import './DownloadPhotos.css';

export function DownloadPhotos() {
  const { session } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isDM = session?.role === 'dm';
  const storeName = session?.storeName || '';

  useEffect(() => {
    loadPhotos();
  }, [storeName, isDM]);

  const loadPhotos = async () => {
    setLoading(true);
    setError('');
    try {
      // DM sees all photos, store manager sees only their store's photos
      const storeFilter = isDM ? '' : storeName;
      const photoData = await getPhotos(storeFilter);
      setPhotos(photoData);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadPhotos();
  };

  if (loading) {
    return (
      <Layout title="Photos" showBack>
        <div className="download-loading">Loading photos...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Photos" showBack>
      <div className="download-page">
        <div className="download-header">
          <h2>{isDM ? 'All Store Photos' : `${storeName} Photos`}</h2>
          <Button onClick={handleRefresh} variant="secondary">
            Refresh
          </Button>
        </div>

        {error && <div className="download-error">{error}</div>}

        {photos.length === 0 ? (
          <div className="download-empty">
            <p>No photos uploaded yet.</p>
            <p className="download-empty__hint">
              Photos will appear here when mobile experts upload them.
            </p>
          </div>
        ) : (
          <div className="download-list">
            {photos.map((photo, index) => (
              <div key={`${photo.fileId}-${index}`} className="download-item">
                <div className="download-item__info">
                  <div className="download-item__store">
                    {isDM && <span className="download-item__store-name">{photo.storeName}</span>}
                    <span className="download-item__expert">{photo.mobileExpert}</span>
                  </div>
                  <div className="download-item__date">
                    {photo.date} at {photo.time}
                  </div>
                </div>
                <a
                  href={photo.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="download-item__link"
                >
                  View Photo
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="download-count">
          {photos.length} photo{photos.length !== 1 ? 's' : ''} total
        </div>
      </div>
    </Layout>
  );
}
