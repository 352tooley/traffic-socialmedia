import { useState, useEffect } from 'react';
import { getPhotos } from '../services/sheetsService';
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
      const allPhotos = await getPhotos('', false); // Get recent, non-deleted photos
      // Get the 6 most recent photos for the collage
      setPhotos(allPhotos.slice(0, 6));
    } catch (err) {
      console.error('Error loading photos for hero:', err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="photo-hero">
      <div className="photo-hero__collage">
        {loading ? (
          <div className="photo-hero__loading">
            <div className="photo-hero__shimmer"></div>
            <div className="photo-hero__shimmer"></div>
            <div className="photo-hero__shimmer"></div>
          </div>
        ) : photos.length > 0 ? (
          photos.map((photo, index) => (
            <div key={photo.fileId} className={`photo-hero__item photo-hero__item--${index + 1}`}>
              <img 
                src={photo.fileUrl} 
                alt={`Photo by ${photo.mobileExpert}`}
                loading="lazy"
              />
            </div>
          ))
        ) : (
          <div className="photo-hero__empty">
            <div className="photo-hero__empty-icon">📸</div>
            <p>Your photos will appear here</p>
          </div>
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
