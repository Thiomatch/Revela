import { supabase } from './supabaseClient';
import { useMemo, useState } from "react";
import "./App.css";

type Drama = {
  id: number;
  title: string;
  category: string;
  views: string;
  image?: string;
  videoUrl?: string;
  badge?: string;
};

type UserProfile = {
  name: string;
  email: string;
};

const dramas: Drama[] = [
  {
    id: 1,
    title: "Shadows",
    category: "Deep Waters",
    views: "6.9M",
    image: "https://ffsvbbmzwhwzzxpvcfrq.supabase.co/storage/v1/object/public/videos/image.shadowsE1.png",
    videoUrl: "https://ffsvbbmzwhwzzxpvcfrq.supabase.co/storage/v1/object/public/videos/Episode%201.mp4",
  },
];

const SHADOWS_EPISODE_2_URL = "https://ffsvbbmzwhwzzxpvcfrq.supabase.co/storage/v1/object/public/videos/Episode%202.mp4";

const tabs = ["Popular", "New", "Rankings", "Categories", "Anime"];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="icon search-icon">
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <div className="crown-wrapper">
      <div className="discount-badge">-17%</div>
      <span className="crown">♛</span>
    </div>
  );
}

function GiftIcon() {
  return (
    <div className="gift-wrapper">
      <div className="gift-badge">+70</div>
      <span className="gift">🎁</span>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="play-icon">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon">
      <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon">
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path d="M10 8l5 4-5 4z" />
    </svg>
  );
}

function MemberIcon() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon">
      <path d="M8 15c1.8-2 6.2-2 8 0" />
      <circle cx="12" cy="9" r="3" />
      <path d="M5 21c.8-3.2 3-5 7-5s6.2 1.8 7 5" />
      <path d="M18 5l1 1 2-2" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon">
      <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21c.8-4 3.2-6 7-6s6.2 2 7 6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="chevron-icon">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("Popular");
  const [search, setSearch] = useState("");
  const [activeNav, setActiveNav] = useState("Home");

  // Authentication & Modal States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [selectedDrama, setSelectedDrama] = useState<any | null>(null);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showNextEpisodePrompt, setShowNextEpisodePrompt] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [unlockedEpisode, setUnlockedEpisode] = useState(1);

  const filteredDramas = useMemo(() => {
    let result = dramas;

    if (activeTab === "New") {
      result = dramas.filter((drama) => drama.badge === "New");
    }

    if (activeTab === "Rankings") {
      result = [...dramas].sort(
        (a, b) => parseFloat(b.views) - parseFloat(a.views)
      );
    }

    if (activeTab === "Categories") {
      result = dramas.filter(
        (drama) =>
          drama.category === "Revenge" || drama.category === "Sweet Love"
      );
    }

    if (activeTab === "Anime") {
      result = dramas.filter((drama) => drama.category === "Supernatural");
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (drama) =>
          drama.title.toLowerCase().includes(query) ||
          drama.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [activeTab, search]);

  const goToHome = () => {
    setActiveNav("Home");
  };

  const goToProfile = () => {
    setActiveNav("Profile");
  };

  const showComingSoon = (name: string) => {
    alert(`${name} section will be added next.`);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput || (authMode === "register" && !nameInput)) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      if (authMode === "register") {
        const { error } = await supabase.auth.signUp({
          email: emailInput,
          password: passwordInput,
          options: {
            data: { full_name: nameInput }
          }
        });
        if (error) throw error;
        alert("Registration successful! Check your email if verification is required, or sign in now.");
        setAuthMode("login");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailInput,
          password: passwordInput,
        });
        if (error) throw error;
        
        const user = data.user;
        setCurrentUser({
          name: user.user_metadata?.full_name || emailInput.split("@")[0],
          email: user.email || emailInput,
        });

        // Reset form & close modal
        setIsAuthModalOpen(false);
        setEmailInput("");
        setPasswordInput("");
        setNameInput("");
      }
    } catch (error: any) {
      alert(error.message || "Authentication failed");
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
  };
if (selectedDrama) {
    return (
      <div className="video-player-screen" style={{ padding: '20px', background: '#000', minHeight: '100vh', color: '#fff' }}>
        <button 
          onClick={() => {
            setSelectedDrama(null);
            setShowNextEpisodePrompt(false);
            setShowEpisodes(false);
            setSelectedEpisode(1);
          }}
          style={{ marginBottom: '15px', padding: '8px 16px', background: '#e50914', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ← Back to Home
        </button>
        <h2>{selectedDrama.id === 1 ? "Shadows Season One" : selectedDrama.title}</h2>
        <p>{selectedDrama.category}</p>
        
        
<div className="video-frame">
  <video
    key={`${selectedDrama.id}-${selectedEpisode}`}
    src={selectedDrama.id === 1 && selectedEpisode === 2
      ? SHADOWS_EPISODE_2_URL
      : selectedDrama.videoUrl}
    poster={selectedDrama.image}
    controls
    autoPlay
    playsInline
    muted
    className="video-element"
    onEnded={() => {
      if (selectedDrama.id === 1 && selectedEpisode === 1) {
        setUnlockedEpisode(2);
        setShowNextEpisodePrompt(true);
      } else {
        setShowNextEpisodePrompt(false);
      }
    }}
    onPlay={() => setShowNextEpisodePrompt(false)}
  />

  {showNextEpisodePrompt && selectedDrama.id === 1 && selectedEpisode === 1 && (
    <button
      type="button"
      onClick={() => {
        setSelectedEpisode(2);
        setShowEpisodes(false);
        setShowNextEpisodePrompt(false);
      }}
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '24px',
        transform: 'translateX(-50%)',
        zIndex: 30,
        width: 'min(340px, calc(100% - 32px))',
        padding: '16px 20px',
        background: 'rgba(15, 15, 15, 0.94)',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        borderRadius: '10px',
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.55)',
        fontSize: '16px',
        fontWeight: 700,
        textAlign: 'center',
        cursor: 'pointer'
      }}
    >
      Click here to view episode 2
    </button>
  )}

  <div className="episodes-menu-container">
    <button
      type="button"
      className="episodes-menu-button"
      onClick={() => setShowEpisodes((previous) => !previous)}
      aria-label="Show episodes"
      aria-expanded={showEpisodes}
    >
      <span className="episodes-hamburger">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span className="episodes-label">Episodes</span>
    </button>

    {showEpisodes && (
      <div
        className="episodes-dropdown"
        style={{
          background: 'rgba(0, 0, 0, 0.62)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          borderRadius: '18px',
          padding: '20px 24px 24px',
          color: '#fff',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.28)',
        }}
      >
        {selectedDrama.id === 1 ? (
          <>
            <h3 style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: 700 }}>
              Shadows Season 1
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                type="button"
                aria-label="Play episode 1"
                title="Episode 1"
                onClick={() => {
                  setSelectedEpisode(1);
                  setShowEpisodes(false);
                  setShowNextEpisodePrompt(false);
                }}
                style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  border: selectedEpisode === 1 ? '2px solid #fff' : '1.5px solid rgba(255,255,255,.55)',
                  background: 'rgba(0,0,0,.18)', color: '#fff',
                  fontSize: '20px', fontWeight: 700, cursor: 'pointer',
                }}
              >E1</button>
              <button
                type="button"
                aria-label="Play episode 2"
                title="Episode 2"
                onClick={() => {
                  setSelectedEpisode(2);
                  setShowEpisodes(false);
                  setShowNextEpisodePrompt(false);
                }}
                style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  border: selectedEpisode === 2 ? '2px solid #fff' : '1.5px solid rgba(255,255,255,.55)',
                  background: 'rgba(0,0,0,.18)', color: '#fff',
                  fontSize: '20px', fontWeight: 700, cursor: 'pointer',
                }}
              >E2</button>
            </div>
          </>
        ) : (
          <>
            <h3>Episodes</h3>
            {dramas
              .filter((drama) => drama.videoUrl && drama.id !== 1)
              .map((drama) => (
                <button
                  type="button"
                  key={drama.id}
                  className="episode-item"
                  onClick={() => {
                    setSelectedDrama(drama);
                    setSelectedEpisode(1);
                    setShowEpisodes(false);
                    setShowNextEpisodePrompt(false);
                  }}
                >
                  <span>{drama.title}</span>
                </button>
              ))}
          </>
        )}
      </div>
    )}
  </div>
</div>
      </div>
    );
  }
  return (
    <div className="app-shell">
      <div className="app-container">
        
        {/* =========================
            HOME
        ========================= */}
        {activeNav === "Home" && (
          <>
            <header className="top-header">
              <div className="search-area">
                <SearchIcon />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Deny Me, Dragon King"
                  aria-label="Search dramas"
                />
              </div>

              <div className="header-actions">
                <button className="header-button">
                  <CrownIcon />
                </button>
                <button className="header-button">
                  <GiftIcon />
                </button>
              </div>
            </header>

            <nav className="category-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`category-tab ${
                    activeTab === tab ? "selected" : ""
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>

            <main className="content">
              <div className="drama-grid">
                {filteredDramas.map((drama) => (
                  <article 
  className="drama-card" 
  key={drama.id}
  onClick={() => {
    setSelectedDrama(drama);
    setSelectedEpisode(1);
    setShowNextEpisodePrompt(false);
    setShowEpisodes(false);
  }}
  style={{ cursor: 'pointer' }}
>
                    <div className="poster-container">
                      <img
                        src={drama.image}
                        alt={drama.title}
                        className="poster"
                      />
                      {drama.badge && (
                        <span
                          className={`poster-badge ${
                            drama.badge === "Hot" ? "hot" : "new"
                          }`}
                        >
                          {drama.badge}
                        </span>
                      )}
                      <div className="view-count">
                        <PlayIcon />
                        <span>{drama.views}</span>
                      </div>
                    </div>
                    <h2 className="drama-title">{drama.title}</h2>
                    <p className="drama-category">{drama.category}</p>
                  </article>
                ))}
              </div>

              {filteredDramas.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <h3>No dramas found</h3>
                  <p>Try another search.</p>
                </div>
              )}
            </main>

            <button
              className="discount-floating"
              onClick={() => showComingSoon("Discount")}
            >
              <span className="discount-emoji">🎁</span>
              <span>Discount</span>
            </button>

            <button
              className="floating-close"
              onClick={(e) => {
                const button = e.currentTarget;
                button.style.display = "none";
              }}
            >
              ×
            </button>
          </>
        )}

        {/* =========================
            PROFILE PAGE
        ========================= */}
        {activeNav === "Profile" && (
          <main className="profile-page">
            <header className="profile-header">
              <h1>Profile</h1>
              <button
                className="settings-button"
                onClick={() => showComingSoon("Settings")}
              >
                ⚙
              </button>
            </header>

            {/* PROFILE CARD */}
            <section className="profile-card">
              <div className="profile-avatar">
                <ProfileIcon />
              </div>

              <div className="profile-info">
                <h2>{currentUser ? currentUser.name : "Welcome to REVELA"}</h2>
                <p>
                  {currentUser
                    ? currentUser.email
                    : "Sign in to personalize your experience"}
                </p>
              </div>

              {currentUser ? (
                <button className="login-button" onClick={handleSignOut}>
                  Sign Out
                </button>
              ) : (
                <button
                  className="login-button"
                  onClick={() => {
                    setAuthMode("login");
                    setIsAuthModalOpen(true);
                  }}
                >
                  Sign In
                </button>
              )}
            </section>

            {/* COINS */}
            <section className="wallet-card">
              <div className="wallet-item">
                <div className="wallet-icon coin">🪙</div>
                <div>
                  <strong>{currentUser ? "150" : "0"}</strong>
                  <span>Coins</span>
                </div>
              </div>
              <div className="wallet-divider"></div>
              <div className="wallet-item">
                <div className="wallet-icon gift">🎁</div>
                <div>
                  <strong>{currentUser ? "3" : "0"}</strong>
                  <span>Rewards</span>
                </div>
              </div>
            </section>

            {/* MENU */}
            <section className="profile-menu">
              <button
                className="profile-menu-item"
                onClick={() => showComingSoon("Watch History")}
              >
                <span className="menu-icon">🕘</span>
                <span className="menu-text">Watch History</span>
                <ChevronIcon />
              </button>

              <button
                className="profile-menu-item"
                onClick={() => showComingSoon("My List")}
              >
                <span className="menu-icon">🔖</span>
                <span className="menu-text">My List</span>
                <ChevronIcon />
              </button>

              <button
                className="profile-menu-item"
                onClick={() => showComingSoon("Downloads")}
              >
                <span className="menu-icon">⬇</span>
                <span className="menu-text">Downloads</span>
                <ChevronIcon />
              </button>

              <button
                className="profile-menu-item"
                onClick={() => showComingSoon("Notifications")}
              >
                <span className="menu-icon">🔔</span>
                <span className="menu-text">Notifications</span>
                <span className="menu-badge">0</span>
                <ChevronIcon />
              </button>

              <button
                className="profile-menu-item"
                onClick={() => showComingSoon("Help & Feedback")}
              >
                <span className="menu-icon">❓</span>
                <span className="menu-text">Help & Feedback</span>
                <ChevronIcon />
              </button>

              <button
                className="profile-menu-item"
                onClick={() => showComingSoon("About Thio")}
              >
                <span className="menu-icon">ℹ</span>
                <span className="menu-text">About Thio</span>
                <ChevronIcon />
              </button>
            </section>

            <div className="profile-version">REVELA v1.0.0</div>
          </main>
        )}

        {/* =========================
            OTHER TABS
        ========================= */}
        {activeNav === "For You" && (
          <div className="coming-page">
            <div className="coming-icon">▶</div>
            <h2>For You</h2>
            <p>Personalized recommendations will appear here.</p>
          </div>
        )}

        {activeNav === "Member" && (
          <div className="coming-page">
            <div className="coming-icon">♕</div>
            <h2>Member</h2>
            <p>Membership and premium features will appear here.</p>
          </div>
        )}

        {activeNav === "My List" && (
          <div className="coming-page">
            <div className="coming-icon">🔖</div>
            <h2>My List</h2>
            <p>Your saved dramas will appear here.</p>
          </div>
        )}

        {/* =========================
            BOTTOM NAVIGATION
        ========================= */}
        <nav className="bottom-navigation">
          <button
            className={`bottom-item ${activeNav === "Home" ? "active" : ""}`}
            onClick={goToHome}
          >
            <HomeIcon />
            <span>Home</span>
          </button>

          <button
            className={`bottom-item ${activeNav === "For You" ? "active" : ""}`}
            onClick={() => setActiveNav("For You")}
          >
            <VideoIcon />
            <span>For You</span>
          </button>

          <button
            className={`bottom-item ${activeNav === "Member" ? "active" : ""}`}
            onClick={() => setActiveNav("Member")}
          >
            <MemberIcon />
            <span>Member</span>
          </button>

          <button
            className={`bottom-item ${activeNav === "My List" ? "active" : ""}`}
            onClick={() => setActiveNav("My List")}
          >
            <BookmarkIcon />
            <span>My List</span>
          </button>

          <button
            className={`bottom-item ${activeNav === "Profile" ? "active" : ""}`}
            onClick={goToProfile}
          >
            <div className="profile-icon-wrapper">
              <ProfileIcon />
              <span className="notification-dot"></span>
            </div>
            <span>Profile</span>
          </button>
        </nav>

        {/* =========================
            LOGIN / REGISTER MODAL
        ========================= */}
        {isAuthModalOpen && (
          <div className="auth-modal-overlay">
            <div className="auth-modal-card">
              <div className="auth-modal-header">
                <h2>{authMode === "login" ? "Sign In" : "Create Account"}</h2>
                <button
                  className="auth-close-btn"
                  onClick={() => setIsAuthModalOpen(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="auth-form">
                {authMode === "register" && (
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                  />
                </div>

                <button type="submit" className="auth-submit-btn">
                  {authMode === "login" ? "Sign In" : "Register"}
                </button>
              </form>

              <div className="auth-switch-mode">
                {authMode === "login" ? (
                  <p>
                    Don't have an account?{" "}
                    <span onClick={() => setAuthMode("register")}>Register</span>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <span onClick={() => setAuthMode("login")}>Sign In</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;