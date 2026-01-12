import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStoreRoster } from '../services/sheetsService';
import { Layout, Button } from '../components';
import './UploadPhoto.css';

const LAST_REP_KEY = 'traffic_sm_last_rep';
const LOCAL_ROSTER_KEY = 'traffic_sm_roster_';

export function UploadPhoto() {
  const { session } = useAuth();
  const [repName, setRepName] = useState('');
  const [customRepName, setCustomRepName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [roster, setRoster] = useState<string[]>([]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const storeName = session?.storeName || '';

  useEffect(() => {
    // Load last used rep name
    const lastRep = localStorage.getItem(LAST_REP_KEY);
    if (lastRep) setRepName(lastRep);

    // If already logged in as rep, use that name
    if (session?.repName) {
      setRepName(session.repName);
    }

    // Load roster for dropdown
    loadRoster();
  }, [session]);

  const loadRoster = async () => {
    // First check localStorage for local roster
    const localRoster = localStorage.getItem(LOCAL_ROSTER_KEY + storeName);
    if (localRoster) {
      setRoster(JSON.parse(localRoster));
    } else {
      // Load from sheet
      const sheetRoster = await getStoreRoster(storeName);
      setRoster(sheetRoster);
    }
  };

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

  const getSelectedRepName = () => {
    if (repName === '__other__') return customRepName.trim();
    return repName.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalRepName = getSelectedRepName();
    if (!finalRepName) {
      alert('Please enter or select your name');
      return;
    }

    if (!selectedFile) {
      alert('Please select a photo');
      return;
    }

    // Save rep name preference
    localStorage.setItem(LAST_REP_KEY, finalRepName);

    // Download the photo with metadata in filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${storeName}_${finalRepName}_${timestamp}.jpg`;

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
          <div className="upload-form__store">
            Store: <strong>{storeName}</strong>
          </div>

          <div className="upload-form__field">
            <label htmlFor="repName">Your Name *</label>
            {roster.length > 0 ? (
              <>
                <select
                  id="repName"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                >
                  <option value="">Select your name...</option>
                  {roster.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                  <option value="__other__">Other (type name)</option>
                </select>
                {repName === '__other__' && (
                  <input
                    type="text"
                    value={customRepName}
                    onChange={(e) => setCustomRepName(e.target.value)}
                    placeholder="Type your name"
                    className="upload-form__other-input"
                  />
                )}
              </>
            ) : (
              <input
                id="repName"
                type="text"
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder="Enter your name"
              />
            )}
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
            disabled={!getSelectedRepName() || !selectedFile}
          >
            Save Photo
          </Button>
        </form>
      </div>
    </Layout>
  );
}
