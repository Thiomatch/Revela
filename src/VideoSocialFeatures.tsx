import { useEffect, useRef, useState } from 'react';
import { getVideoLikeCount, incrementVideoLike, subscribeToVideoLikeCount } from './videoLikes';

type VideoSocialFeaturesProps = {
  videoId: string;
  onOpenEpisodes: () => void;
  onRequireRegistration: () => void;
};

export default function VideoSocialFeatures({
  videoId,
  onOpenEpisodes,
  onRequireRegistration: _onRequireRegistration,
}: VideoSocialFeaturesProps) {
  const [likesCount, setLikesCount] = useState<number>(0);
  const [pendingLikes, setPendingLikes] = useState(0);
  const [likesLoading, setLikesLoading] = useState(true);
  const [likeError, setLikeError] = useState('');
  const [showPlusOne, setShowPlusOne] = useState<boolean>(false);
  const [commentCount] = useState<number>(84);
  const [shareCount] = useState<number>(42);
  const serverCountRef = useRef(0);
  const pendingLikesRef = useRef(0);
  const activeVideoIdRef = useRef(videoId);
  const likeQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    activeVideoIdRef.current = videoId;
    serverCountRef.current = 0;
    pendingLikesRef.current = 0;
    setLikesCount(0);
    setPendingLikes(0);
    setLikesLoading(true);
    setLikeError('');

    const updateServerCount = (count: number) => {
      if (activeVideoIdRef.current !== videoId || pendingLikesRef.current > 0) return;
      serverCountRef.current = Math.max(serverCountRef.current, count);
      setLikesCount(serverCountRef.current + pendingLikesRef.current);
      setLikesLoading(false);
    };

    const unsubscribe = subscribeToVideoLikeCount(videoId, updateServerCount);
    void getVideoLikeCount(videoId)
      .then(updateServerCount)
      .catch((error: unknown) => {
        if (activeVideoIdRef.current === videoId) {
          setLikeError(error instanceof Error ? error.message : 'Likes could not be loaded.');
          setLikesLoading(false);
        }
      });

    return () => {
      unsubscribe();
      if (activeVideoIdRef.current === videoId) activeVideoIdRef.current = '';
    };
  }, [videoId]);

  const handleLikeClick = () => {
    const requestedVideoId = videoId;
    pendingLikesRef.current += 1;
    setPendingLikes(pendingLikesRef.current);
    setLikesCount(serverCountRef.current + pendingLikesRef.current);
    setLikeError('');
    setShowPlusOne(true);

    window.setTimeout(() => setShowPlusOne(false), 1000);
    likeQueueRef.current = likeQueueRef.current.then(async () => {
      let incrementSucceeded = false;
      try {
        const count = await incrementVideoLike(requestedVideoId);
        incrementSucceeded = true;
        if (activeVideoIdRef.current === requestedVideoId) {
          serverCountRef.current = Math.max(serverCountRef.current, count);
        }
      } catch (error) {
        if (activeVideoIdRef.current === requestedVideoId) {
          setLikeError(error instanceof Error ? error.message : 'Your like could not be saved.');
        }
      } finally {
        if (activeVideoIdRef.current === requestedVideoId) {
          pendingLikesRef.current = Math.max(0, pendingLikesRef.current - 1);
          setPendingLikes(pendingLikesRef.current);
          setLikesCount(serverCountRef.current + pendingLikesRef.current);
          setLikesLoading(false);

          if (pendingLikesRef.current === 0) {
            void getVideoLikeCount(requestedVideoId)
              .then((count) => {
                if (activeVideoIdRef.current !== requestedVideoId || pendingLikesRef.current > 0) return;
                serverCountRef.current = Math.max(serverCountRef.current, count);
                setLikesCount(serverCountRef.current);
              })
              .catch((error: unknown) => {
                if (activeVideoIdRef.current === requestedVideoId) {
                  setLikeError(error instanceof Error ? error.message : 'Likes could not be refreshed.');
                }
              });
          }
          if (incrementSucceeded) setLikeError('');
        }
      }
    });
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

      {/* 2. Repeatable, persisted video likes */}
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
          aria-label={`Like video, ${likesCount} likes`}
          aria-busy={pendingLikes > 0}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: pendingLikes > 0 ? '#ff3b30' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '20px',
            backdropFilter: 'blur(4px)'
          }}
        >
          ♥
        </button>
        <span style={{ fontSize: '11px', color: '#fff', marginTop: '4px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {likesLoading ? '…' : likesCount}
        </span>
        {pendingLikes > 0 && (
          <span aria-live="polite" style={{ fontSize: '9px', color: '#e0e0e0' }}>
            Saving {pendingLikes}…
          </span>
        )}
        {likeError && (
          <span role="alert" style={{ maxWidth: '100px', color: '#ff6b6b', fontSize: '9px', textAlign: 'center' }}>
            {likeError}
          </span>
        )}
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