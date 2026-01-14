import { useState, useEffect } from 'react';
import { getApprovedPhotos } from '../services/sheetsService';
import type { Photo } from '../types';
import './PhotoHero.css';

export function PhotoHero() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentPhotos();
  }, []);

  const loadRecentPhotos = async () => {
    try {
      console.log('PhotoHero: Loading approved photos...');
      const approvedPhotos = await getApprovedPhotos();
      console.log('PhotoHero: Received approved photos:', approvedPhotos.length, approvedPhotos);
      
      // Get the 6 most recent approved photos for the collage
      const displayPhotos = approvedPhotos.slice(0, 6);
      console.log('PhotoHero: Displaying photos:', displayPhotos.length, displayPhotos);
      
      if (displayPhotos.length > 0) {
        console.log('PhotoHero: Setting photos state with:', displayPhotos);
        setPhotos(displayPhotos);
      } else {
        console.warn('PhotoHero: No approved photos to display');
      }
    } catch (err) {
      console.error('PhotoHero: Error loading photos:', err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  console.log('PhotoHero: Render - loading:', loading, 'photos.length:', photos.length);

  return (
    <div className="photo-hero">
      <div className="photo-hero__collage">
        {loading ? (
          <>
            {console.log('PhotoHero: Rendering loading state')}
            <div className="photo-hero__loading">
              <div className="photo-hero__shimmer"></div>
              <div className="photo-hero__shimmer"></div>
              <div className="photo-hero__shimmer"></div>
            </div>
          </>
        ) : photos.length > 0 ? (
          <>
            {console.log('PhotoHero: Rendering photos grid, count:', photos.length)}
            {photos.map((photo, index) => {
              console.log(`PhotoHero: Rendering photo ${index + 1}:`, photo.fileUrl, photo);
              return (
                <div key={photo.fileId} className={`photo-hero__item photo-hero__item--${index + 1}`}>
                  <img 
                    src={photo.fileUrl} 
                    alt={`Photo by ${photo.mobileExpert}`}
                    onLoad={() => console.log(`PhotoHero: Image ${index + 1} loaded successfully`)}
                    onError={(e) => console.error(`PhotoHero: Image ${index + 1} failed to load`, e)}
                    style={{ border: '2px solid yellow' }}
                  />
                </div>
              );
            })}
          </>
        ) : (
          <>
            {console.log('PhotoHero: Rendering empty state')}
            <div className="photo-hero__empty">
              <div className="photo-hero__empty-icon">📸</div>
              <p>Your photos will appear here</p>
            </div>
          </>
        )}
        <div className="photo-hero__overlay"></div>
      </div>
      
      <div className="photo-hero__content">
        <h1 className="photo-hero__title">Show Your Wins</h1>
        <p className="photo-hero__subtitle">
          Upload your photos. See your team. Get recognized.
        </p>
      </div>
    </div>
  );
}
