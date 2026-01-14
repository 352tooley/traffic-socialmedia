import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPhotos, deletePhoto } from '../services/sheetsService';
import type { Photo } from '../types';
import { Layout, Button } from '../components';
import './DownloadPhotos.css';

export function DownloadPhotos() {
  const { session } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Photo | null>(null);

  const isDM = session?.role === 'dm';
  const isStore = session?.role === 'store';
  const storeName = session?.storeName || '';

  // Show delete button for store managers and DM
  const canDelete = isDM || isStore;

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

  const handleDeleteClick = (photo: Photo) => {
    setConfirmDelete(photo);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    setDeletingId(confirmDelete.fileId);
    setConfirmDelete(null);

    try {
      const success = await deletePhoto(confirmDelete.fileId, confirmDelete.storeName);
      if (success) {
        // Remove from local state
        setPhotos(photos.filter(p => p.fileId !== confirmDelete.fileId));
      } else {
        setError('Failed to delete photo. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError('Failed to delete photo. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDelete(null);
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
                <div className="download-item__actions">
                  <a
                    href={photo.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-item__link"
                  >
                    View
                  </a>
                  {canDelete && (
                    <button
                      className="download-item__delete"
                      onClick={() => handleDeleteClick(photo)}
                      disabled={deletingId === photo.fileId}
                    >
                      {deletingId === photo.fileId ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="download-modal-overlay">
            <div className="download-modal">
              <h3>Delete Photo?</h3>
              <p>
                Are you sure you want to delete this photo by <strong>{confirmDelete.mobileExpert}</strong>?
              </p>
              <p className="download-modal__warning">
                This will remove the photo from Google Drive and cannot be undone.
              </p>
              <div className="download-modal__actions">
                <Button variant="secondary" onClick={handleDeleteCancel}>
                  Cancel
                </Button>
                <button className="download-modal__delete-btn" onClick={handleDeleteConfirm}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="download-count">
          {photos.length} photo{photos.length !== 1 ? 's' : ''} total
        </div>
      </div>
    </Layout>
  );
}
