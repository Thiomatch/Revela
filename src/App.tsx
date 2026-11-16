import { useState, useEffect } from 'react';  
import OneSignal from '@onesignal/capacitor-plugin';
import { supabase } from './supabaseClient';
import { RegistrationModal } from './RegistrationModal';
import VideoSocialFeatures from './VideoSocialFeatures';
import AdministrativePortal, { type AdminPortalView } from './AdministrativePortal';
import { type AdminUser } from './adminStore';

export const App = () => {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<number>(1);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'synopsis' | 'episodes'>('episodes');
  
  // State to control showing the database poster first vs playing the video
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Transition States for Bottom Slide on Video End
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextEpisodeData, setNextEpisodeData] = useState<any>(null);

  // Registration Gate States
  const [showRegModal, setShowRegModal] = useState(false);

  // Administrative Portal & Auth States
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [adminPortalView, setAdminPortalView] = useState<AdminPortalView>('rules');

  // Get the movie poster public URL dynamically from Supabase storage bucket 'videos'
  const posterUrl = supabase.storage.from('Videos').getPublicUrl('image.Shadows.S1.png').data.publicUrl;

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

    // Check if an existing admin session is saved locally
    const storedUser = localStorage.getItem('revela_admin_user');
    if (storedUser) {
      try {
        setAdminUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }
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
    const epNumber = Number(epInput);
    setCurrentEpisode(epNumber);
    setShowEpisodeModal(false);
    setIsPlaying(true); // Switch to video player when an episode is selected
  };

  // Triggered the exact moment the video finishes or reaches the end
  const handleVideoEnded = () => {
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
      />
    );
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', height: '100vh', width: '100vw', margin: 0, padding: 0, overflow: 'hidden', position: 'relative', fontFamily: 'sans-serif' }}>
      
      {/* Top Right Auth / Profile "ME" Badge Control */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 30 }}>
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
      <div className="video-frame video-transition-container" style={{ width: '100%', height: '100%', position: 'relative', background: '#000', overflow: 'hidden' }}>
        
        {!isPlaying ? (
          /* Startup Movie Poster from Supabase Storage with Play Button Overlay */
          <div 
            onClick={() => setIsPlaying(true)}
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
              key={displayEpisode?.id || displayEpisode?.episode_number || currentEpisode}
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
              <source src={displayEpisode?.video_url || ''} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

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