import { format } from 'date-fns';
import type { Submission } from '../types';
import './PhotoGrid.css';

interface PhotoGridProps {
  submissions: Submission[];
  showStoreName?: boolean;
  emptyMessage?: string;
}

export function PhotoGrid({
  submissions,
  showStoreName = false,
  emptyMessage = 'No photos found',
}: PhotoGridProps) {
  const handleDownload = async (submission: Submission) => {
    try {
      const response = await fetch(submission.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${submission.storeName}_${submission.repName}_${format(
        submission.timestamp,
        'yyyy-MM-dd_HH-mm'
      )}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
      // Fallback: open in new tab
      window.open(submission.imageUrl, '_blank');
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="photo-grid__empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="photo-grid">
      {submissions.map((submission) => (
        <div key={submission.id} className="photo-card">
          <div className="photo-card__image-wrapper">
            <img
              src={submission.imageUrl}
              alt={`${submission.repName} submission`}
              className="photo-card__image"
              loading="lazy"
            />
          </div>
          <div className="photo-card__info">
            <p className="photo-card__rep">{submission.repName}</p>
            <p className="photo-card__date">
              {format(submission.timestamp, 'MMM d, yyyy h:mm a')}
            </p>
            {showStoreName && (
              <p className="photo-card__store">{submission.storeName}</p>
            )}
            <button
              className="photo-card__download"
              onClick={() => handleDownload(submission)}
            >
              Download
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
