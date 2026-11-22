import { useState, useEffect, useRef } from 'react';
import OneSignal from '@onesignal/capacitor-plugin';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';
import { RegistrationModal } from './RegistrationModal';
import VideoSocialFeatures from './VideoSocialFeatures';
import AdministrativePortal, { type AdminPortalView } from './AdministrativePortal';
import WorkWithUs from './WorkWithUs';
import { getApprovedVideos, type AdminUser, type AdminVideo } from './adminStore';
import { initializeAdMob, registerBannerAdListeners, showBottomBanner } from './admob';

export const App = () => {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<number>(1);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'synopsis' | 'episodes'>('episodes');
  const [creatorVideos, setCreatorVideos] = useState<AdminVideo[]>([]);
  const [creatorVideosError, setCreatorVideosError] = useState('');
  const [selectedCreatorVideo, setSelectedCreatorVideo] = useState<AdminVideo | null>(null);
  const hasUserSelectedPlaybackRef = useRef(false);
  
  // State to control showing the database poster first vs playing the video
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Transition States for Bottom Slide on Video End
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextEpisodeData, setNextEpisodeData] = useState<any>(null);

  // Registration Gate States
  const [showRegModal, setShowRegModal] = useState(false);

  // Administrative Portal & Auth States
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [adminPortalView, setAdminPortalView] = useState<AdminPortalView>('rules');
  const [showWorkWithUs, setShowWorkWithUs] = useState(false);
  const [workWithUsInitialView, setWorkWithUsInitialView] = useState<'apply' | 'admin'>('apply');

  // Get the movie poster public URL dynamically from Supabase storage bucket 'videos'
  const posterUrl = supabase.storage.from('Videos').getPublicUrl('image.Shadows.S1.png').data.publicUrl;

  useEffect(() => {
    let isCancelled = false;
    let removeBannerListeners: (() => void) | undefined;

    // Initialize OneSignal Push Notifications
    const initOneSignal = async () => {
      try {
        await OneSignal.initialize("9601f063-b605-46de-a8ad-a6ec259a8be6");
        await OneSignal.Notifications.requestPermission(true);
      } catch (error) {
        console.error("OneSignal initialization error:", error);
      }
    };

    // Initialize Google AdMob & Bottom Banner on Native Devices
    const initAds = async () => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        const cleanupListeners = await registerBannerAdListeners(
          () => {
            console.info('AdMob banner loaded');
          },
          (error) => {
            console.error('AdMob banner failed to load:', error);
          },
        );
        if (isCancelled) {
          cleanupListeners();
          return;
        }
        removeBannerListeners = cleanupListeners;

        await initializeAdMob();
        if (isCancelled) return;
        await showBottomBanner();
      } catch (error) {
        console.error("AdMob initialization error:", error);
      }
    };

    initOneSignal();
    void initAds();
    fetchEpisodes();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user.email ?? null);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Could not load the signed-in account:', error.message);
        return;
      }
      setSignedInEmail(data.session?.user.email ?? null);
    });

    // Check if an existing admin session is saved locally
    const storedUser = localStorage.getItem('revela_admin_user');
    if (storedUser) {
      try {
        setAdminUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }
    return () => {
      isCancelled = true;
      removeBannerListeners?.();
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    void getApprovedVideos()
      .then((videos) => {
        if (!isCancelled) {
          setCreatorVideos(videos);
          setCreatorVideosError('');
          if (videos.length > 0 && !hasUserSelectedPlaybackRef.current) {
            setSelectedCreatorVideo(videos[0]);
            setIsPlaying(true);
          }
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setCreatorVideosError(error instanceof Error ? error.message : 'Creator videos could not be loaded.');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const fetchEpisodes = async () => {
    // Fetching episodes from Supabase with fallbacks for column names
    const { data, error } = await supabase
      .from('episodes')
      .select('*');
    
    if (data && data.length > 0) {
      // Normalize data to ensure 'episode_number' and 'video_url' exist correctly
      const normalized = data.map((item, index) => ({
        ...item,
        episode_number: item.episode_number || item.episodeNumber || index + 1,
        video_url: item.video_url || item.videoUrl || item.url
      }));
      normalized.sort((a, b) => a.episode_number - b.episode_number);
      setEpisodes(normalized);
    } else {
      if (error) console.error('Error fetching episodes:', error.message);
      // Fallback sample episode so grid never stays empty (0) during testing
      setEpisodes([
        { id: 1, episode_number: 1, video_url: '' },
        { id: 2, episode_number: 2, video_url: '' },
        { id: 3, episode_number: 3, video_url: '' },
        { id: 4, episode_number: 4, video_url: '' }
      ]);
    }
  };

  const activeEpisodeData = episodes.find((ep) => ep.episode_number === currentEpisode) || episodes[0];

  const handleSelectEpisode = (epInput: number | string) => {
    hasUserSelectedPlaybackRef.current = true;
    const epNumber = Number(epInput);
    setSelectedCreatorVideo(null);
    setCurrentEpisode(epNumber);
    setShowEpisodeModal(false);
    setIsPlaying(true); // Switch to video player when an episode is selected
  };

  const handlePlayCreatorVideo = (video: AdminVideo) => {
    hasUserSelectedPlaybackRef.current = true;
    setSelectedCreatorVideo(video);
    setIsTransitioning(false);
    setNextEpisodeData(null);
    setIsPlaying(true);
  };

  // Triggered the exact moment the video finishes or reaches the end
  const handleVideoEnded = () => {
    if (selectedCreatorVideo) {
      setSelectedCreatorVideo(null);
      setIsPlaying(false);
      return;
    }
    if (isTransitioning) return; // Prevent duplicate triggers

    const nextEpNum = currentEpisode + 1;
    const foundNextEp = episodes.find((ep) => ep.episode_number === nextEpNum);

    if (foundNextEp) {
      setNextEpisodeData(foundNextEp);
      setIsTransitioning(true);

      // Match this timeout duration with your CSS transition (0.4s)
      setTimeout(() => {
        setCurrentEpisode(nextEpNum);
        setIsTransitioning(false);
        setNextEpisodeData(null);
      }, 400);
    }
  };

  const handleRequireRegistration = () => {
    setShowRegModal(true);
  };

  const handleRegistrationSuccess = () => {
    setShowRegModal(false);
  };

  const handleAdminCreated = (user: AdminUser) => {
    setAdminUser(user);
    localStorage.setItem('revela_admin_user', JSON.stringify(user));
    setShowAdminPortal(false);
  };

  // Sort episodes by episode_number to keep them properly ordered
  const sortedEpisodes = [...episodes].sort((a, b) => a.episode_number - b.episode_number);

  const displayEpisode = isTransitioning && nextEpisodeData ? nextEpisodeData : activeEpisodeData;

  // Render Administrative Portal if active
  if (showAdminPortal) {
    return (
      <AdministrativePortal
        view={adminPortalView}
        adminUser={adminUser}
        onNavigate={(view) => {
          if (view === 'player') {
            setShowAdminPortal(false);
          } else {
            setAdminPortalView(view);
          }
        }}
        onAdminCreated={handleAdminCreated}
        onAdminUpdated={(user) => {
          setAdminUser(user);
          localStorage.setItem('revela_admin_user', JSON.stringify(user));
        }}
        onAdminLogout={() => {
          setAdminUser(null);
          localStorage.removeItem('revela_admin_user');
        }}
        onPlayVideo={() => {
          setShowAdminPortal(false);
          setIsPlaying(true);
        }}
        onOpenAgreementAdmin={() => {
          setShowAdminPortal(false);
          setWorkWithUsInitialView('admin');
          setShowWorkWithUs(true);
        }}
      />
    );
  }

  if (showWorkWithUs) {
    return (
      <WorkWithUs
        initialView={workWithUsInitialView}
        onClose={() => {
          setShowWorkWithUs(false);
          if (workWithUsInitialView === 'admin') setShowAdminPortal(true);
          setWorkWithUsInitialView('apply');
        }}
      />
    );
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', height: '100vh', width: '100vw', margin: 0, padding: 0, overflowX: 'hidden', overflowY: 'auto', position: 'relative', fontFamily: 'sans-serif' }}>
      {/* Top Right Auth / Profile "ME" Badge Control */}
    <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 30, display: 'flex', alignItems: 'center', gap: '10px' }}>
        {(adminUser || signedInEmail) && (
          <button
            type="button"
            onClick={() => {
              setWorkWithUsInitialView('apply');
              setShowWorkWithUs(true);
            }}
            style={{
              background: 'rgba(20, 20, 20, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              padding: '9px 13px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
            }}
          >
            Work With Us
          </button>
        )}
        {adminUser ? (
          <button
            onClick={() => {
              setAdminPortalView('profile');
              setShowAdminPortal(true);
            }}
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              border: '2px solid #e50914',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              padding: 0,
              cursor: 'pointer',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
            }}
            title="My Profile"
          >
            {adminUser.avatar ? (
              <img src={adminUser.avatar} alt={adminUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>ME</span>
            )}
          </button>
        ) : signedInEmail ? (
          <span
            style={{
              maxWidth: '220px',
              overflow: 'hidden',
              color: '#fff',
              fontSize: '13px',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '8px 12px',
              borderRadius: '20px',
              background: 'rgba(20, 20, 20, 0.85)',
              backdropFilter: 'blur(4px)'
            }}
            title={signedInEmail}
          >
            {signedInEmail}
          </span>
        ) : (
          <button
            onClick={() => {
              setAdminPortalView('rules');
              setShowAdminPortal(true);
            }}
            style={{
              background: 'rgba(20, 20, 20, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
            }}
          >
            Log in / Sign up
          </button>
        )}
      </div>

      {/* Fullscreen Container */}
      <div className="video-frame video-transition-container" style={{ width: '100%', height: '100vh', minHeight: '500px', position: 'relative', background: '#000', overflow: 'hidden' }}>
        
        {!isPlaying ? (
          /* Startup Movie Poster from Supabase Storage with Play Button Overlay */
          <div 
            onClick={() => {
              hasUserSelectedPlaybackRef.current = true;
              setIsPlaying(true);
            }}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
          >
            <img 
              src={posterUrl} 
              alt="Movie Poster" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(229, 9, 20, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
              color: '#fff',
              fontSize: '28px',
              paddingLeft: '4px'
            }}>
              ▶
            </div>
          </div>
        ) : (
          /* Actual Video Player View */
          <div className={`episode-slide-wrapper ${isTransitioning ? 'slide-enter-active' : 'slide-enter'}`} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <video
              key={selectedCreatorVideo?.id || displayEpisode?.id || displayEpisode?.episode_number || currentEpisode}
              className="video-element"
              controls
              autoPlay
              playsInline
              preload="auto"
              onEnded={handleVideoEnded}
              onTimeUpdate={(e) => {
                const video = e.currentTarget;
                if (video.duration && video.currentTime >= video.duration - 0.4 && !isTransitioning) {
                  handleVideoEnded();
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            >
              <source src={selectedCreatorVideo?.videoUrl || displayEpisode?.video_url || ''} type={selectedCreatorVideo ? undefined : 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Bottom-Left Movie Title & Synopsis Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '84px',
          left: '16px',
          right: '80px',
          zIndex: 15,
          pointerEvents: 'none',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)'
        }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: '#fff' }}>
            {selectedCreatorVideo
              ? selectedCreatorVideo.title
              : `Shadows: Deep waters — Ep. ${displayEpisode?.episode_number || currentEpisode}`}
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#e0e0e0', lineHeight: 1.3 }}>
            {selectedCreatorVideo
              ? `Uploaded by: ${selectedCreatorVideo.creatorName || selectedCreatorVideo.ownerEmail}`
              : 'Dark secrets emerge as strange tides sweep across the quiet coastal village.'}
          </p>
        </div>

        {/* Floating Social Features & Episode Button on Middle Right */}
        <VideoSocialFeatures 
          key={selectedCreatorVideo ? `creator:${selectedCreatorVideo.id}` : `episode:${displayEpisode?.id ?? currentEpisode}`}
          videoId={selectedCreatorVideo ? `creator:${selectedCreatorVideo.id}` : `episode:${displayEpisode?.id ?? currentEpisode}`}
          onOpenEpisodes={() => setShowEpisodeModal(true)}
          onOpenComments={() => setShowCommentsModal(true)}
          onRequireRegistration={handleRequireRegistration}
        />
      </div>

      <section aria-labelledby="creator-spotlight-heading" style={{ padding: '28px 20px 36px', background: '#0a0a0c' }}>
        <h2 id="creator-spotlight-heading" style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 700 }}>
          Creator Spotlight
        </h2>
        {creatorVideosError ? (
          <p role="alert" style={{ margin: 0, color: '#ff6b6b', fontSize: '13px' }}>
            Creator videos could not be loaded: {creatorVideosError}
          </p>
        ) : creatorVideos.length === 0 ? (
          <p style={{ margin: 0, color: '#8e8e93', fontSize: '13px' }}>No approved creator videos yet.</p>
        ) : (
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
            {creatorVideos.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => handlePlayCreatorVideo(video)}
                aria-label={`Play ${video.title} by ${video.creatorName || video.ownerEmail}`}
                style={{ flex: '0 0 220px', padding: 0, border: '1px solid #2a2a2e', borderRadius: '12px', overflow: 'hidden', background: '#141416', color: '#fff', textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ position: 'relative', height: '124px', background: '#242428' }}>
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <video src={video.videoUrl} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  )}
                  <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '25px', textShadow: '0 1px 5px #000' }}>
                    ▶
                  </span>
                </div>
                <div style={{ padding: '12px' }}>
                  <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px', marginBottom: '10px' }}>
                    {video.title}
                  </strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {video.creatorAvatar ? (
                      <img src={video.creatorAvatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <span aria-hidden="true" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#38383d', fontSize: '11px', fontWeight: 700 }}>
                        {(video.creatorName || video.ownerEmail).slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#b8b8bd', fontSize: '12px' }}>
                      Uploaded by: {video.creatorName || video.ownerEmail}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {showCommentsModal && (
        <div
          className="video-comments-modal-backdrop"
          onClick={() => setShowCommentsModal(false)}
        >
          <section
            className="video-social-panel video-comments-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-comments-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="video-comments">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 id="video-comments-heading">Comments</h3>
                <button
                  type="button"
                  onClick={() => setShowCommentsModal(false)}
                  aria-label="Close comments"
                  style={{
                    border: 0,
                    background: 'transparent',
                    color: '#fff',
                    fontSize: '24px',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>
              <p className="comments-empty">Comments are not available yet.</p>
            </div>
          </section>
        </div>
      )}

      {/* Episode Selector Modal (Redesigned Grid Layout) */}
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
            {/* Top Drag Indicator Handle */}
            <div style={{ width: '40px', height: '4px', background: '#3a3a3c', borderRadius: '2px', margin: '0 auto 16px auto' }} />

            {/* Header Series Info Preview */}
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

            {/* Synopsis / Episodes Navigation Tabs */}
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

            {/* Tab Content */}
            {activeTab === 'synopsis' ? (
              <div style={{ color: '#d1d1d6', fontSize: '14px', lineHeight: '1.5', padding: '10px 0 20px 0' }}>
                <p style={{ margin: 0 }}>
                  Dark secrets emerge as strange tides sweep across the quiet coastal village. Follow the journey as buried truths come to light in this thrilling drama series.
                </p>
              </div>
            ) : (
              <div>
                {/* Range Selector Subtitle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#8e8e93', fontWeight: '600' }}>
                    Episodes ({sortedEpisodes.length})
                  </span>
                </div>

                {/* Numbered Episode Grid */}
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