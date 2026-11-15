import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AdministrativePortal from './AdministrativePortal';
import VideoSocialFeatures from './VideoSocialFeatures';
import './App.css';

// --- TYPES ---
type Episode = {
  id: number;
  title: string;
  video_url: string;
  duration?: string;
};

type Drama = {
  id: string;
  title: string;
  category: string;
  poster_url: string;
  views: string;
  badge?: 'hot' | 'new';
  episodes?: Episode[];
};

export default function App() {
  // Navigation & View States
  const [currentTab, setCurrentTab] = useState<'home' | 'reward' | 'library' | 'profile'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(0);
  
  // Auth & Admin States
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authName, setAuthName] = useState<string>('');
  const [authLocation, setAuthLocation] = useState<string>('');
  const [authPic] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80');
  const [_setAuthPic] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80');
  const [showAdminPortal, setShowAdminPortal] = useState<boolean>(false);

  // Video Player UI States
  const [showEpisodesDropdown, setShowEpisodesDropdown] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sample Dramas with Episodes to ensure instant playback & poster visibility
  const sampleDramas: Drama[] = [
    {
      id: '1',
      title: 'The Hidden Heir',
      category: 'Romance',
      poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
      views: '1.2M',
      badge: 'hot',
      episodes: [
        { id: 1, title: 'Episode 1: The Return', video_url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
        { id: 2, title: 'Episode 2: Secret Alliance', video_url: 'https://www.w3schools.com/html/movie.mp4' },
        { id: 3, title: 'Episode 3: Unmasked', video_url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
      ]
    },
    {
      id: '2',
      title: 'CEO & Me',
      category: 'Drama',
      poster_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
      views: '850K',
      badge: 'new',
      episodes: [
        { id: 1, title: 'Episode 1: First Encounter', video_url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
        { id: 2, title: 'Episode 2: The Contract', video_url: 'https://www.w3schools.com/html/movie.mp4' }
      ]
    }
  ];

  const [dramas] = useState<Drama[]>(sampleDramas);

  // Check active session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, emailFallback?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setUser(data);
      } else {
        setUser({ id: userId, email: emailFallback, name: emailFallback?.split('@')[0] || 'User', profile_pic: authPic });
      }
    } catch {
      setUser({ id: userId, email: emailFallback, name: 'User', profile_pic: authPic });
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      try {
        const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        if (data.user) {
          const profileData = {
            id: data.user.id,
            email: authEmail,
            name: authName || authEmail.split('@')[0],
            location: authLocation,
            profile_pic: authPic,
            password: authPassword
          };
          await supabase.from('profiles').insert([profileData]);
          setUser(profileData);
          setShowAuthModal(false);
          setToastMessage('Account created successfully! Welcome.');
        }
      } catch (err: any) {
        alert(err.message || 'Sign up failed');
      }
    } else {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        if (data.user) {
          await fetchUserProfile(data.user.id, authEmail);
          setShowAuthModal(false);
          setToastMessage('Logged in successfully!');
        }
      } catch (err: any) {
        alert(err.message || 'Login failed');
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentTab('home');
    setToastMessage('Logged out successfully');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = () => {
    if (navigator.share && selectedDrama) {
      navigator.share({
        title: selectedDrama.title,
        text: `Watch ${selectedDrama.title} on Revela!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!');
    }
  };

  return (
    <div className="app-shell">
      <div className="app-container">

        {/* TOP-RIGHT AUTH OR ME BADGE */}
        {user ? (
          <div 
            className="top-right-me-badge" 
            onClick={() => setCurrentTab('profile')}
            title="View Profile"
          >
            <img src={user.profile_pic || authPic} alt="Me" />
            <span>ME</span>
          </div>
        ) : (
          <button 
            type="button" 
            className="top-right-auth-pill"
            onClick={() => setShowAuthModal(true)}
          >
            Log in / Sign up
          </button>
        )}

        {/* MAIN VIEWPORT */}
        {showAdminPortal ? (
          <AdministrativePortal 
            onClose={() => setShowAdminPortal(false)} 
            onRequireLogin={() => setShowAuthModal(true)} 
          />
        ) : selectedDrama ? (
          /* VIDEO PLAYER / PLAYER VIEW WITH WORKING EPISODES & SHARE */
          <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            {/* Back button to home */}
            <button 
              onClick={() => { setSelectedDrama(null); setIsPlaying(false); setShowEpisodesDropdown(false); }}
              style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 30, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>

            {/* Video Player */}
            <div className="video-frame" style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                key={selectedDrama.episodes?.[currentEpisodeIndex]?.video_url}
                className="video-element"
                controls
                autoPlay={isPlaying}
                src={selectedDrama.episodes?.[currentEpisodeIndex]?.video_url || 'https://www.w3schools.com/html/mov_bbb.mp4'}
                poster={selectedDrama.poster_url}
                onPlay={() => setIsPlaying(true)}
              />

              {/* Episodes Hamburger Menu Top Right */}
              <div className="episodes-menu-container">
                <button 
                  type="button"
                  className="episodes-menu-button"
                  onClick={() => setShowEpisodesDropdown(!showEpisodesDropdown)}
                >
                  <div className="episodes-hamburger">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="episodes-label">EPS</span>
                </button>

                {showEpisodesDropdown && (
                  <div className="episodes-dropdown">
                    <h3>Episodes ({selectedDrama.episodes?.length || 0})</h3>
                    {selectedDrama.episodes?.map((ep, idx) => (
                      <button
                        key={ep.id}
                        className="episode-item"
                        style={{ background: currentEpisodeIndex === idx ? '#303030' : 'transparent' }}
                        onClick={() => {
                          setCurrentEpisodeIndex(idx);
                          setShowEpisodesDropdown(false);
                          setIsPlaying(true);
                        }}
                      >
                        <span className="episode-play">▶</span>
                        <span>{ep.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Social Features (Like & Share buttons) */}
              <VideoSocialFeatures 
                videoId={selectedDrama.id}
                onOpenEpisodes={() => setShowEpisodesDropdown(!showEpisodesDropdown)}
                onRequireRegistration={() => setShowAuthModal(true)}
              />

              {/* Share Floating Button */}
              <button
                type="button"
                onClick={handleShare}
                style={{
                  position: 'absolute',
                  right: '16px',
                  bottom: '170px',
                  zIndex: 20,
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <span>🔗</span>
                <span style={{ fontSize: '9px', marginTop: '2px' }}>Share</span>
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD TABS CONTAINER */
          <>
            {currentTab === 'home' && (
              <div className="content" style={{ padding: 0 }}>
                
                {/* HERO POSTER SECTION WITH 'CLICK TO WATCH SEASON 1' */}
                {dramas.length > 0 && (
                  <div 
                    onClick={() => { setSelectedDrama(dramas[0]); setCurrentEpisodeIndex(0); setIsPlaying(true); }}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '380px',
                      backgroundImage: `url(${dramas[0].poster_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: '20px'
                    }}
                  >
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 60%)' }} />
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      <span style={{ background: '#ff3b30', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                        Featured Hit
                      </span>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: 'bold', margin: '8px 0 4px', color: '#fff' }}>
                        {dramas[0].title}
                      </h2>
                      <p style={{ color: '#ffcc00', fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>
                        ▶ Click to watch Season 1
                      </p>
                    </div>
                  </div>
                )}

                {/* CATEGORY TABS */}
                <div className="category-tabs" style={{ marginTop: '14px' }}>
                  {['All', 'Romance', 'Drama', 'Action', 'Trending'].map((cat) => (
                    <button
                      key={cat}
                      className={`category-tab ${selectedCategory === cat ? 'selected' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* DRAMA GRID */}
                <div style={{ padding: '12px 16px 80px 16px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '12px', color: '#fff' }}>Popular Dramas</h3>
                  <div className="drama-grid">
                    {dramas.filter(d => selectedCategory === 'All' || d.category === selectedCategory).map((drama) => (
                      <div 
                        key={drama.id} 
                        className="drama-card"
                        onClick={() => { setSelectedDrama(drama); setCurrentEpisodeIndex(0); setIsPlaying(true); }}
                      >
                        <div className="poster-container">
                          <img src={drama.poster_url} alt={drama.title} className="poster" />
                          {drama.badge && (
                            <span className={`poster-badge ${drama.badge}`}>{drama.badge.toUpperCase()}</span>
                          )}
                          <div className="view-count">
                            <svg className="play-icon" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="white"/></svg>
                            {drama.views}
                          </div>
                        </div>
                        <h4 className="drama-title">{drama.title}</h4>
                        <span className="drama-category">{drama.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'reward' && (
              <div className="coming-page">
                <div className="coming-icon">🎁</div>
                <h2>Rewards & Bonuses</h2>
                <p>Check back daily for coins and free episodes!</p>
              </div>
            )}

            {currentTab === 'library' && (
              <div className="coming-page">
                <div className="coming-icon">📚</div>
                <h2>My Watchlist</h2>
                <p>Your saved and recently watched dramas will appear here.</p>
              </div>
            )}

            {currentTab === 'profile' && (
              <div className="profile-page">
                <div className="profile-header">
                  <h1>My Profile</h1>
                  <button className="settings-button" onClick={() => setShowAdminPortal(true)} title="Creator Portal">⚙️</button>
                </div>
                <div className="profile-card">
                  <div className="profile-avatar">
                    {user?.profile_pic ? (
                      <img src={user.profile_pic} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <svg className="nav-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    )}
                  </div>
                  <div className="profile-info">
                    <h2>{user ? user.name || user.email : 'Guest User'}</h2>
                    <p>{user ? user.email : 'Sign in to sync your watch history'}</p>
                    {user ? (
                      <button className="login-button" onClick={handleSignOut} style={{ background: '#ff3b30', color: '#fff' }}>Log Out</button>
                    ) : (
                      <button className="login-button" onClick={() => setShowAuthModal(true)}>Log in / Sign up</button>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button 
                    onClick={() => setShowAdminPortal(true)}
                    style={{ width: '100%', padding: '14px', background: '#1c1c1e', border: '1px solid #333', borderRadius: '12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>🎥 Creator & Content Portal</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* BOTTOM NAVIGATION BAR */}
            <nav className="bottom-navigation">
              <button className={`bottom-item ${currentTab === 'home' ? 'active' : ''}`} onClick={() => setCurrentTab('home')}>
                <svg className="nav-icon" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span>Home</span>
              </button>
              <button className={`bottom-item ${currentTab === 'reward' ? 'active' : ''}`} onClick={() => setCurrentTab('reward')}>
                <svg className="nav-icon" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                <span>Reward</span>
              </button>
              <button className={`bottom-item ${currentTab === 'library' ? 'active' : ''}`} onClick={() => setCurrentTab('library')}>
                <svg className="nav-icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <span>Library</span>
              </button>
              <button className={`bottom-item ${currentTab === 'profile' ? 'active' : ''}`} onClick={() => setCurrentTab('profile')}>
                <div className="profile-icon-wrapper">
                  <svg className="nav-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {!user && <span className="notification-dot" />}
                </div>
                <span>Profile</span>
              </button>
            </nav>
          </>
        )}

        {/* AUTHENTICATION MODAL */}
        {showAuthModal && (
          <div className="auth-modal-overlay">
            <div className="auth-modal-card">
              <div className="auth-modal-header">
                <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
                <button className="auth-close-btn" onClick={() => setShowAuthModal(false)}>×</button>
              </div>
              <form onSubmit={handleAuthSubmit} className="auth-form">
                {isSignUp && (
                  <>
                    <div className="form-group">
                      <label>Full Name</label>
                      <input type="text" placeholder="Your Name" value={authName} onChange={(e) => setAuthName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <input type="text" placeholder="City, Country" value={authLocation} onChange={(e) => setAuthLocation(e.target.value)} />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" placeholder="name@example.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
                </div>
                <button type="submit" className="auth-submit-btn">
                  {isSignUp ? 'Sign Up & Continue' : 'Log In'}
                </button>
              </form>
              <div className="auth-switch-mode">
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <span onClick={() => setIsSignUp(!isSignUp)}>
                  {isSignUp ? 'Log in' : 'Sign up'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '10px 20px', borderRadius: '8px', zIndex: 1000, fontSize: '0.85rem' }}>
            {toastMessage}
          </div>
        )}

      </div>
    </div>
  );
}