import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPendingPhotos, getApprovedPhotos, approvePhoto, rejectPhoto, unapprovePhoto, uploadDMPhoto } from '../services/sheetsService';
import type { Photo } from '../types';
import { Layout, Button } from '../components';
import './Approvals.css';

type ViewTab = 'pending' | 'approved';

export function Approvals() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const district = session?.district || 'West';
  const [activeTab, setActiveTab] = useState<ViewTab>('pending');
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]);
  const [approvedPhotos, setApprovedPhotos] = useState<Photo[]>([]);
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
  }, [session, navigate, district]);

  const loadPendingPhotos = async () => {
    setLoading(true);
    setError('');
    try {
      const [pending, approved] = await Promise.all([
        getPendingPhotos(district),
        getApprovedPhotos(district)
      ]);
      setPendingPhotos(pending);
      setApprovedPhotos(approved);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Failed to load photos');
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
        // Reload to get updated approved list
        await loadPendingPhotos();
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

  const handleUnapprove = async (photo: Photo) => {
    setProcessingId(photo.fileId);
    try {
      const success = await unapprovePhoto(photo.fileId);
      if (success) {
        setApprovedPhotos(approvedPhotos.filter(p => p.fileId !== photo.fileId));
      } else {
        setError('Failed to remove photo from homepage');
      }
    } catch (err) {
      setError('Failed to remove photo from homepage');
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

        const result = await uploadDMPhoto(district, 'DM', base64, fileName);

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
          <h2>Homepage Photos</h2>
          <Button onClick={() => setShowDMUpload(!showDMUpload)} variant="secondary">
            {showDMUpload ? 'Cancel' : '+ Upload District Photo'}
          </Button>
        </div>

        {error && <div className="approvals-error">{error}</div>}

        {/* Tabs */}
        <div className="approvals-tabs">
          <button
            className={`approvals-tab ${activeTab === 'pending' ? 'approvals-tab--active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ Pending Approval ({pendingPhotos.length})
          </button>
          <button
            className={`approvals-tab ${activeTab === 'approved' ? 'approvals-tab--active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            ✅ On Homepage ({approvedPhotos.length})
          </button>
        </div>

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
          <div className="approvals-loading">Loading photos...</div>
        ) : (
          <>
            {/* Pending Photos Tab */}
            {activeTab === 'pending' && (
              <>
                {pendingPhotos.length === 0 ? (
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
              </>
            )}

            {/* Approved Photos Tab */}
            {activeTab === 'approved' && (
              <>
                {approvedPhotos.length === 0 ? (
                  <div className="approvals-empty">
                    <p>📭 No approved photos yet</p>
                    <p className="approvals-empty__hint">
                      Approve photos from the Pending tab to show them on the homepage.
                    </p>
                  </div>
                ) : (
                  <div className="approvals-grid">
                    {approvedPhotos.map((photo) => (
                      <div key={photo.fileId} className="approval-card approval-card--approved">
                        <div className="approval-card__image">
                          <img src={photo.fileUrl} alt={photo.fileName} />
                          <div className="approval-card__badge approval-card__badge--live">
                            ✅ Live on Homepage
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
                            className="approval-card__remove"
                            onClick={() => handleUnapprove(photo)}
                            disabled={processingId === photo.fileId}
                          >
                            {processingId === photo.fileId ? '...' : '🗑️ Remove from Homepage'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
