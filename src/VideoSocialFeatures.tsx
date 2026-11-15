import { useState } from 'react';

type VideoSocialFeaturesProps = {
  _videoId: string;
  onOpenEpisodes: () => void;
  _onRequireRegistration: () => void;
};

export default function VideoSocialFeatures({
  onOpenEpisodes,
}: VideoSocialFeaturesProps) {
  const [likesCount, setLikesCount] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [showPlusOne, setShowPlusOne] = useState<boolean>(false);

  const handleLikeClick = () => {
    if (!hasLiked) {
      setLikesCount(prev => prev + 1);
      setHasLiked(true);
      setShowPlusOne(true);

      // Flash "1" and revert/fade back after 1 second
      setTimeout(() => {
        setShowPlusOne(false);
      }, 1000);
    } else {
      setLikesCount(prev => Math.max(0, prev - 1));
      setHasLiked(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      right: '16px',
      bottom: '100px',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    }}>
      {/* Like Button with temporary floating '1' / highlight effect */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {showPlusOne && (
          <span style={{
            position: 'absolute',
            top: '-24px',
            color: '#ff3b30',
            fontWeight: 'bold',
            fontSize: '14px',
            animation: 'fadeInOut 1s ease forwards',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)'
          }}>
            +1
          </span>
        )}
        <button
          type="button"
          onClick={handleLikeClick}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: hasLiked ? '#ff3b30' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '20px',
            backdropFilter: 'blur(4px)'
          }}
          aria-label="Like video"
        >
          ♥
        </button>
        <span style={{ fontSize: '11px', color: '#fff', marginTop: '4px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {likesCount > 0 ? likesCount : 'Like'}
        </span>
      </div>

      {/* Episodes Button */}
      <button
        type="button"
        onClick={onOpenEpisodes}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          backdropFilter: 'blur(4px)'
        }}
      >
        EPS
      </button>
    </div>
  );
}