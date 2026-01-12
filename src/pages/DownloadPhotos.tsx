import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components';
import './DownloadPhotos.css';

export function DownloadPhotos() {
  const { session } = useAuth();

  const isDM = session?.role === 'dm';
  const storeName = session?.storeName || 'All Stores';

  return (
    <Layout title="Download Photos" showBack>
      <div className="download-page">
        <div className="download-info">
          <h2>{isDM ? 'All Store Photos' : `${storeName} Photos`}</h2>
          <p>
            Photos are saved locally to devices when reps use the Upload feature.
            To collect photos, have reps share their downloaded photos via your
            preferred method (email, shared drive, etc.).
          </p>
          <div className="download-naming">
            <h3>Photo Naming Format</h3>
            <p>Photos are automatically named with:</p>
            <code>[StoreName]_[RepName]_[Timestamp].jpg</code>
          </div>
        </div>
      </div>
    </Layout>
  );
}
