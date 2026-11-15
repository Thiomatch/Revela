import { useState } from 'react';

type VideoSocialFeaturesProps = {
  videoId: string;
  onOpenEpisodes: () => void;
  onRequireRegistration: () => void;
};

export default function VideoSocialFeatures({
  videoId: _videoId,
  onOpenEpisodes,
  onRequireRegistration: _onRequireRegistration,
}: VideoSocialFeaturesProps) {
  const [likesCount, setLikesCount] = useState<number>(1240);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [showPlusOne, setShowPlusOne] = useState<boolean>(false);
  const [commentCount] = useState<number>(84);
  const [shareCount] = useState<number>(42);

  const handleLikeClick = () => {
    if (!hasLiked) {
      setLikesCount(prev => prev + 1);
      setHasLiked(true);
      setShowPlusOne(true);

      setTimeout(() => {
        setShowPlusOne(false);
      }, 1000);
    } else {
      setLikesCount(prev => Math.max(0, prev - 1));
      setHasLiked(false);
    }
  };

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Revela Video',
          text: 'Check out this amazing video on Revela!',
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy link to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
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
      {/* 1. EPS Button (Moved to the top) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
          aria-label="Episodes list"
        >
          EPS
        </button>
        <span style={{ fontSize: '11px', color: '#fff', marginTop: '4px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          Series
        </span>
      </div>

      {/* 2. Like Button with temporary floating '+1' effect */}
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
          {likesCount}
        </span>
      </div>

      {/* 3. Comment Button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            fontSize: '18px',
            backdropFilter: 'blur(4px)'
          }}
          aria-label="Comments"
        >
          💬
        </button>
        <span style={{ fontSize: '11px', color: '#fff', marginTop: '4px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {commentCount}
        </span>
      </div>

      {/* 4. Share Button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleShareClick}
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
            fontSize: '16px',
            backdropFilter: 'blur(4px)'
          }}
          aria-label="Share video"
        >
          🔗
        </button>
        <span style={{ fontSize: '11px', color: '#fff', marginTop: '4px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {shareCount}
        </span>
      </div>
    </div>
  );
}