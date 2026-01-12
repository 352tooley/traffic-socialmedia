import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Layout, Button } from '../components';
import './UploadPhoto.css';

export function UploadPhoto() {
  const { session } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const storeName = session?.storeName || '';
  const mobileExpertName = session?.mobileExpertName || '';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleTakePhoto = () => {
    cameraInputRef.current?.click();
  };

  const handleChooseGallery = () => {
    galleryInputRef.current?.click();
  };

  const handleClearPhoto = () => {
    setSelectedFile(null);
    setPreview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Please select a photo');
      return;
    }

    // Download the photo with metadata in filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${storeName}_${mobileExpertName}_${timestamp}.jpg`;

    // Create download link
    const link = document.createElement('a');
    link.href = preview!;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccess(true);
  };

  const handleUploadAnother = () => {
    setSuccess(false);
    setSelectedFile(null);
    setPreview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  if (success) {
    return (
      <Layout title="Upload Photo" showBack>
        <div className="upload-success">
          <div className="upload-success__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2>Photo Saved!</h2>
          <p>Your photo has been downloaded with the correct naming format.</p>
          <Button variant="large" onClick={handleUploadAnother}>
            Upload Another Photo
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Upload Photo" showBack>
      <div className="upload-page">
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="upload-form__info">
            <div className="upload-form__store">
              Store: <strong>{storeName}</strong>
            </div>
            <div className="upload-form__name">
              Mobile Expert: <strong>{mobileExpertName}</strong>
            </div>
          </div>

          <div className="upload-form__photo-section">
            <label>Photo *</label>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {preview ? (
              <div className="upload-form__preview">
                <img src={preview} alt="Preview" />
                <button
                  type="button"
                  className="upload-form__clear-btn"
                  onClick={handleClearPhoto}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="upload-form__buttons">
                <button
                  type="button"
                  className="upload-form__photo-btn"
                  onClick={handleTakePhoto}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Take Photo
                </button>
                <button
                  type="button"
                  className="upload-form__photo-btn"
                  onClick={handleChooseGallery}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Choose From Gallery
                </button>
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="large"
            fullWidth
            disabled={!selectedFile}
          >
            Save Photo
          </Button>
        </form>
      </div>
    </Layout>
  );
}
