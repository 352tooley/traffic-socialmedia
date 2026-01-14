import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPhotos, deletePhoto, featurePhoto, uploadTeamPhoto } from '../services/sheetsService';
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
  const [featuringId, setFeaturingId] = useState<string | null>(null);
  const [showTeamUpload, setShowTeamUpload] = useState(false);
  const [selectedTeamPhoto, setSelectedTeamPhoto] = useState<File | null>(null);
  const [teamPhotoPreview, setTeamPhotoPreview] = useState<string | null>(null);
  const [uploadingTeam, setUploadingTeam] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDM = session?.role === 'dm';
  const isStore = session?.role === 'store';
  const district = session?.district || 'West';
  const storeName = session?.storeName || '';

  // Show delete button for store managers and DM
  const canDelete = isDM || isStore;
  const canFeature = isStore; // Only RSM can recommend for homepage

  useEffect(() => {
    loadPhotos();
  }, [storeName, isDM, district]);

  const loadPhotos = async () => {
    setLoading(true);
    setError('');
    try {
      // DM sees all photos, store manager sees only their store's photos
      const storeFilter = isDM ? '' : storeName;
      const photoData = await getPhotos(storeFilter, false, district);
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

  const handleFeatureClick = async (photo: Photo) => {
    if (!storeName) return;
    
    setFeaturingId(photo.fileId);
    try {
      const success = await featurePhoto(photo.fileId, storeName);
      if (success) {
        // Update local state
        setPhotos(photos.map(p => 
          p.fileId === photo.fileId 
            ? { ...p, featuredStatus: 'pending', featuredBy: storeName }
            : p
        ));
      } else {
        setError('Failed to feature photo. Please try again.');
      }
    } catch (err) {
      console.error('Error featuring photo:', err);
      setError('Failed to feature photo. Please try again.');
    } finally {
      setFeaturingId(null);
    }
  };

  const handleTeamPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedTeamPhoto(file);
      setTeamPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleTeamPhotoUpload = async () => {
    if (!selectedTeamPhoto || !storeName) return;

    setUploadingTeam(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedTeamPhoto);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${storeName}_team_${timestamp}.jpg`;

        const result = await uploadTeamPhoto(district, storeName, storeName, base64, fileName);

        if (result.success) {
          setUploadSuccess(true);
          setSelectedTeamPhoto(null);
          setTeamPhotoPreview(null);
          setTimeout(() => {
            setUploadSuccess(false);
            setShowTeamUpload(false);
            loadPhotos();
          }, 2000);
        } else {
          setError(result.error || 'Upload failed');
        }
        setUploadingTeam(false);
      };
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
      setUploadingTeam(false);
    }
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
          <h2>{isDM ? `${district} District Photos` : `${storeName} Photos`}</h2>
          <div className="download-header__actions">
            {isStore && (
              <Button onClick={() => setShowTeamUpload(!showTeamUpload)} variant="secondary">
                {showTeamUpload ? 'Cancel' : '+ Team Photo'}
              </Button>
            )}
            <Button onClick={handleRefresh} variant="secondary">
              Refresh
            </Button>
          </div>
        </div>

        {error && <div className="download-error">{error}</div>}

        {/* Team Photo Upload (RSM only) */}
        {isStore && showTeamUpload && (
          <div className="team-upload">
            <h3>📸 Upload Team Photo for Homepage</h3>
            <p className="team-upload__hint">
              Upload a fun photo of your team. It will be sent to DM for approval before appearing on the homepage.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleTeamPhotoSelect}
              style={{ display: 'none' }}
            />

            {teamPhotoPreview ? (
              <div className="team-upload__preview">
                <img src={teamPhotoPreview} alt="Preview" />
                <button
                  className="team-upload__clear"
                  onClick={() => {
                    setSelectedTeamPhoto(null);
                    setTeamPhotoPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                className="team-upload__select"
                onClick={() => fileInputRef.current?.click()}
              >
                📷 Select Photo
              </button>
            )}

            {selectedTeamPhoto && (
              <Button
                variant="large"
                fullWidth
                onClick={handleTeamPhotoUpload}
                disabled={uploadingTeam}
              >
                {uploadingTeam ? 'Uploading...' : 'Submit for Approval'}
              </Button>
            )}

            {uploadSuccess && (
              <div className="team-upload__success">
                ✅ Photo submitted! DM will review it.
              </div>
            )}
          </div>
        )}

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
                  {photo.fileUrl && photo.fileUrl.startsWith('http') ? (
                    <a
                      href={photo.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-item__link"
                    >
                      View
                    </a>
                  ) : (
                    <span className="download-item__no-link">No file</span>
                  )}
                  {canFeature && photo.featuredStatus !== 'pending' && photo.featuredStatus !== 'approved' && (
                    <button
                      className="download-item__feature"
                      onClick={() => handleFeatureClick(photo)}
                      disabled={featuringId === photo.fileId}
                    >
                      {featuringId === photo.fileId ? 'Submitting...' : '⭐ Feature'}
                    </button>
                  )}
                  {photo.featuredStatus === 'pending' && (
                    <span className="download-item__status download-item__status--pending">
                      ⏳ Pending DM Approval
                    </span>
                  )}
                  {photo.featuredStatus === 'approved' && (
                    <span className="download-item__status download-item__status--approved">
                      ✅ On Homepage
                    </span>
                  )}
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
