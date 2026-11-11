import { useState, useEffect, useRef, type SyntheticEvent } from 'react';  
import OneSignal from '@onesignal/capacitor-plugin';
import { supabase } from './supabaseClient';
import { RegistrationModal } from './RegistrationModal';
import VideoSocialFeatures from './VideoSocialFeatures';

export const App = () => {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<number>(1);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'synopsis' | 'episodes'>('episodes');

  // Track whether the user has clicked start from the poster overlay
  const [hasStarted, setHasStarted] = useState(false);

  // Transition States for Bottom Slide on Video End
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextEpisodeData, setNextEpisodeData] = useState<any>(null);

  // Registration Gate States
  const [showRegModal, setShowRegModal] = useState(false);

  // Get the movie poster public URL from Supabase storage
  const posterUrl = supabase.storage.from('videos').getPublicUrl('image.Shadows.S1.png').data.publicUrl;

  useEffect(() => {
    // Initialize OneSignal Push Notifications
    const initOneSignal = async () => {
      try {
        await OneSignal.initialize("9601f063-b605-46de-a8ad-a6ec259a8be6");
        await OneSignal.Notifications.requestPermission(true);
      } catch (error) {
        console.error("OneSignal initialization error:", error);
      }
    };

    initOneSignal();
    fetchEpisodes();
  }, []);

  const fetchEpisodes = async () => {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .order('episode_number', { ascending: true });
    
    if (data) {
      setEpisodes(data);
    } else if (error) {
      console.error('Error fetching episodes:', error.message);
    }
  };

  const activeEpisodeData = episodes.find((ep) => Number(ep.episode_number) === currentEpisode) || episodes[0];
  const sortedEpisodes = [...episodes].sort((a, b) => Number(a.episode_number) - Number(b.episode_number));
  const displayEpisode = isTransitioning && nextEpisodeData ? nextEpisodeData : activeEpisodeData;

  const handleSelectEpisode = (epInput: number | string) => {
    const epNumber = Number(epInput);
    setCurrentEpisode(epNumber);
    setShowEpisodeModal(false);
  };

  // Ask the browser/Android WebView to start the currently loaded episode.
  const attemptAutoplay = async (video: HTMLVideoElement) => {
    try {
      await video.play();
    } catch (error) {
      console.warn('Automatic video playback was blocked by the device:', error);
    }
  };

  // Run whenever a new episode URL is rendered, but only after the user has clicked start.
  useEffect(() => {
    const video = videoRef.current;
    if (video && displayEpisode?.video_url && hasStarted) {
      void attemptAutoplay(video);
    }
  }, [displayEpisode?.video_url, hasStarted]);

  // Triggered when an episode finishes. Select the next available episode number.
  const handleVideoEnded = () => {
    if (isTransitioning) return; // Prevent duplicate triggers

    const foundNextEp = episodes
      .filter((ep) => Number(ep.episode_number) > currentEpisode)
      .sort((a, b) => Number(a.episode_number) - Number(b.episode_number))[0];

    if (foundNextEp) {
      const nextEpNum = Number(foundNextEp.episode_number);
      setNextEpisodeData(foundNextEp);
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentEpisode(nextEpNum);
        setIsTransitioning(false);
        setNextEpisodeData(null);
      }, 400);
    }
  };

  const handleVideoCanPlay = (event: SyntheticEvent<HTMLVideoElement>) => {
    if (hasStarted) {
      void attemptAutoplay(event.currentTarget);
    }
  };

  const handleRequireRegistration = () => {
    setShowRegModal(true);
  };

  const handleRegistrationSuccess = () => {
    setShowRegModal(false);
  };

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', height: '100vh', width: '100vw', margin: 0, padding: 0, overflow: 'hidden', position: 'relative', fontFamily: 'sans-serif' }}>
      
      {/* Fullscreen Video Frame Container with Slide Transition Wrapper */}
      <div className="video-frame video-transition-container" style={{ width: '100%', height: '100%', position: 'relative', background: '#000', overflow: 'hidden' }}>
        
        {/* Click-to-Watch Movie Poster Overlay */}
        {!hasStarted && (
          <div 
            onClick={() => {
              setHasStarted(true);
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.play().catch((err) => console.warn("Playback error:", err));
                }
              }, 50);
            }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 30,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000'
            }}
          >
            <img 
              src={posterUrl} 
              alt="Movie Poster" 
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} 
            />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
            
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '20px' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'rgba(229, 9, 20, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                boxShadow: '0 4px 20px rgba(229, 9, 20, 0.6)'
              }}>
                <span style={{ fontSize: '28px', color: '#fff', marginLeft: '4px' }}>▶</span>
              </div>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                Shadows: Deep Waters
              </h2>
              <p style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.8)', background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: '20px', display: 'inline-block' }}>
                Click to watch season 1
              </p>
            </div>
          </div>
        )}

        <div className={`episode-slide-wrapper ${isTransitioning ? 'slide-enter-active' : 'slide-enter'}`} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          <video
            ref={videoRef}
            key={displayEpisode?.id || displayEpisode?.episode_number || currentEpisode}
            className="video-element"
            controls
            playsInline
            preload="auto"
            poster={posterUrl} /* <-- THIS ENSURES THE MOVIE POSTER SHOWS WHILE LOADING INSTEAD OF THE GREY BOX */
            onEnded={handleVideoEnded}
            onCanPlay={handleVideoCanPlay}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              if (video.duration && video.currentTime >= video.duration - 0.4 && !isTransitioning) {
                handleVideoEnded();
              }
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          >
            <source src={displayEpisode?.video_url || ''} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Bottom-Left Movie Title & Synopsis Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '16px',
          right: '80px',
          zIndex: 15,
          pointerEvents: 'none',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)'
        }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: '#fff' }}>
            Shadows: Deep waters — Ep. {displayEpisode?.episode_number || currentEpisode}
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#e0e0e0', lineHeight: 1.3 }}>
            Dark secrets emerge as strange tides sweep across the quiet coastal village.
          </p>
        </div>

        {/* Floating Social Features & Episode Button on Middle Right */}
        <VideoSocialFeatures 
          videoId={String(currentEpisode)} 
          onOpenEpisodes={() => setShowEpisodeModal(true)}
          onRequireRegistration={handleRequireRegistration}
        />
      </div>

      {/* Episode Selector Modal */}
      {showEpisodeModal && (
        <div 
          onClick={() => setShowEpisodeModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#141416',
              padding: '20px 16px 30px 16px',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              maxHeight: '75vh',
              overflowY: 'auto',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.7)'
            }}
          >
            <div style={{ width: '40px', height: '4px', background: '#3a3a3c', borderRadius: '2px', margin: '0 auto 16px auto' }} />

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ width: '64px', height: '84px', background: '#2c2c2e', borderRadius: '8px', overflow: 'hidden', flexShrink: '0' }}>
                <img 
                  src={posterUrl} 
                  alt="Series Thumbnail" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                  Shadows: Deep Waters
                </h3>
                <span style={{ fontSize: '12px', color: '#8e8e93' }}>26.3M Views</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #2c2c2e', marginBottom: '16px' }}>
              <button
                onClick={() => setActiveTab('synopsis')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0 0 10px 0',
                  color: activeTab === 'synopsis' ? '#fff' : '#8e8e93',
                  fontSize: '15px',
                  fontWeight: activeTab === 'synopsis' ? 'bold' : 'normal',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'synopsis' ? '2px solid #e50914' : '2px solid transparent'
                }}
              >
                Synopsis
              </button>
              <button
                onClick={() => setActiveTab('episodes')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0 0 10px 0',
                  color: activeTab === 'episodes' ? '#fff' : '#8e8e93',
                  fontSize: '15px',
                  fontWeight: activeTab === 'episodes' ? 'bold' : 'normal',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'episodes' ? '2px solid #e50914' : '2px solid transparent'
                }}
              >
                Episodes
              </button>
            </div>

            {activeTab === 'synopsis' ? (
              <div style={{ color: '#d1d1d6', fontSize: '14px', lineHeight: '1.5', padding: '10px 0 20px 0' }}>
                <p style={{ margin: 0 }}>
                  Dark secrets emerge as strange tides sweep across the quiet coastal village. Follow the journey as buried truths come to light in this thrilling drama series.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#8e8e93', fontWeight: '600' }}>
                    Episodes ({sortedEpisodes.length})
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                  {sortedEpisodes.map((ep) => {
                    const epNum = ep.episode_number;
                    const isSelected = currentEpisode === epNum;

                    return (
                      <button
                        key={ep.id || epNum}
                        onClick={() => handleSelectEpisode(epNum)}
                        style={{
                          aspectRatio: '1',
                          backgroundColor: isSelected ? '#707075' : '#262629',
                          color: '#fff',
                          border: isSelected ? '1px solid #ffffff' : 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          fontSize: '14px',
                          fontWeight: '600',
                          transition: 'transform 0.1s ease'
                        }}
                      >
                        <span>{epNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Registration Modal Gate */}
      <RegistrationModal
        isOpen={showRegModal}
        onClose={() => setShowRegModal(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  );
};

export default App;