import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPendingPhotos, approvePhoto, rejectPhoto, uploadDMPhoto } from '../services/sheetsService';
import type { Photo } from '../types';
import { Layout, Button } from '../components';
import './Approvals.css';

export function Approvals() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showDMUpload, setShowDMUpload] = useState(false);
  const [selectedDMPhoto, setSelectedDMPhoto] = useState<File | null>(null);
  const [dmPhotoPreview, setDMPhotoPreview] = useState<string | null>(null);
  const [uploadingDM, setUploadingDM] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Redirect if not DM
    if (session && session.role !== 'dm') {
      navigate('/');
      return;
    }
    loadPendingPhotos();
  }, [session, navigate]);

  const loadPendingPhotos = async () => {
    setLoading(true);
    setError('');
    try {
      const photos = await getPendingPhotos();
      setPendingPhotos(photos);
    } catch (err) {
      console.error('Error loading pending photos:', err);
      setError('Failed to load pending photos');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (photo: Photo) => {
    setProcessingId(photo.fileId);
    try {
      const success = await approvePhoto(photo.fileId);
      if (success) {
        setPendingPhotos(pendingPhotos.filter(p => p.fileId !== photo.fileId));
      } else {
        setError('Failed to approve photo');
      }
    } catch (err) {
      setError('Failed to approve photo');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (photo: Photo) => {
    setProcessingId(photo.fileId);
    try {
      const success = await rejectPhoto(photo.fileId);
      if (success) {
        setPendingPhotos(pendingPhotos.filter(p => p.fileId !== photo.fileId));
      } else {
        setError('Failed to reject photo');
      }
    } catch (err) {
      setError('Failed to reject photo');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDMPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedDMPhoto(file);
      setDMPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleDMPhotoUpload = async () => {
    if (!selectedDMPhoto) return;

    setUploadingDM(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedDMPhoto);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `DM_district_${timestamp}.jpg`;

        const result = await uploadDMPhoto('DM', base64, fileName);

        if (result.success) {
          setUploadSuccess(true);
          setSelectedDMPhoto(null);
          setDMPhotoPreview(null);
          setTimeout(() => {
            setUploadSuccess(false);
            setShowDMUpload(false);
          }, 2000);
        } else {
          setError(result.error || 'Upload failed');
        }
        setUploadingDM(false);
      };
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
      setUploadingDM(false);
    }
  };

  return (
    <Layout title="Photo Approvals" showBack>
      <div className="approvals-page">
        <div className="approvals-header">
          <h2>Pending Homepage Photos</h2>
          <Button onClick={() => setShowDMUpload(!showDMUpload)} variant="secondary">
            {showDMUpload ? 'Cancel' : '+ Upload District Photo'}
          </Button>
        </div>

        {error && <div className="approvals-error">{error}</div>}

        {/* DM Direct Upload (auto-approved) */}
        {showDMUpload && (
          <div className="dm-upload">
            <h3>📸 Upload District Photo</h3>
            <p className="dm-upload__hint">
              Upload a photo directly to the homepage. It will be automatically approved.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleDMPhotoSelect}
              style={{ display: 'none' }}
            />

            {dmPhotoPreview ? (
              <div className="dm-upload__preview">
                <img src={dmPhotoPreview} alt="Preview" />
                <button
                  className="dm-upload__clear"
                  onClick={() => {
                    setSelectedDMPhoto(null);
                    setDMPhotoPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                className="dm-upload__select"
                onClick={() => fileInputRef.current?.click()}
              >
                📷 Select Photo
              </button>
            )}

            {selectedDMPhoto && (
              <Button
                variant="large"
                fullWidth
                onClick={handleDMPhotoUpload}
                disabled={uploadingDM}
              >
                {uploadingDM ? 'Uploading...' : 'Upload to Homepage'}
              </Button>
            )}

            {uploadSuccess && (
              <div className="dm-upload__success">
                ✅ Photo uploaded and live on homepage!
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="approvals-loading">Loading pending photos...</div>
        ) : pendingPhotos.length === 0 ? (
          <div className="approvals-empty">
            <p>🎉 No photos pending approval!</p>
            <p className="approvals-empty__hint">
              Store managers can recommend photos for the homepage.
            </p>
          </div>
        ) : (
          <div className="approvals-grid">
            {pendingPhotos.map((photo) => (
              <div key={photo.fileId} className="approval-card">
                <div className="approval-card__image">
                  <img src={photo.fileUrl} alt={photo.fileName} />
                  <div className="approval-card__badge">
                    {photo.photoType === 'team' ? '👥 Team Photo' : '📸 Mobile Expert'}
                  </div>
                </div>
                <div className="approval-card__info">
                  <div className="approval-card__store">{photo.storeName}</div>
                  <div className="approval-card__meta">
                    By: {photo.mobileExpert} • {photo.date}
                  </div>
                  {photo.featuredBy && (
                    <div className="approval-card__featured">
                      Recommended by: {photo.featuredBy}
                    </div>
                  )}
                </div>
                <div className="approval-card__actions">
                  <button
                    className="approval-card__approve"
                    onClick={() => handleApprove(photo)}
                    disabled={processingId === photo.fileId}
                  >
                    {processingId === photo.fileId ? '...' : '✅ Approve'}
                  </button>
                  <button
                    className="approval-card__reject"
                    onClick={() => handleReject(photo)}
                    disabled={processingId === photo.fileId}
                  >
                    {processingId === photo.fileId ? '...' : '❌ Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="approvals-count">
          {pendingPhotos.length} photo{pendingPhotos.length !== 1 ? 's' : ''} awaiting approval
        </div>
      </div>
    </Layout>
  );
}
