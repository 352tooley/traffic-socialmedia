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
      const approvedPhotos = await getApprovedPhotos();
      // Get the 6 most recent approved photos for the collage
      const displayPhotos = approvedPhotos.slice(0, 6);
      setPhotos(displayPhotos);
    } catch (err) {
      console.error('PhotoHero: Error loading photos:', err);
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
        <h1 className="photo-hero__title">Social Media Manager</h1>
      </div>
    </div>
  );
}
