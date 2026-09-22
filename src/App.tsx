import { useMemo, useState } from "react";
import "./App.css";

type Drama = {
  id: number;
  title: string;
  category: string;
  views: string;
  image: string;
  badge?: "Hot" | "New";
};

const dramas: Drama[] = [
  {
    id: 1,
    title: "Forbidden Pulse in the Rain",
    category: "Revenge",
    views: "4.1M",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=85",
  },
  {
    id: 2,
    title: "He Paid for One Night, Then Wanted Forever",
    category: "Revenge",
    views: "6.9M",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=85",
  },
  {
    id: 3,
    title: "Tempted by My Best Friend's Billionaire Dad",
    category: "Sweet Love",
    views: "47.9M",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=85",
  },
  {
    id: 4,
    title: "Shifter Academy: Taming Three Wild Alphas",
    category: "Supernatural",
    views: "121M",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=85",
    badge: "Hot",
  },
  {
    id: 5,
    title: "The Gift Bride of a Mafia Don",
    category: "Revenge",
    views: "2.9M",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=85",
    badge: "New",
  },
  {
    id: 6,
    title: "She Came Back as My Brother's Fiancée",
    category: "Revenge",
    views: "471K",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=600&q=85",
    badge: "New",
  },
  {
    id: 7,
    title: "My Client's Son Wants Me",
    category: "Sweet Love",
    views: "838K",
    image:
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=600&q=85",
    badge: "New",
  },
  {
    id: 8,
    title: "Trapped in a Lover's Game",
    category: "Sweet Love",
    views: "1.2M",
    image:
      "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&w=600&q=85",
    badge: "New",
  },
  {
    id: 9,
    title: "The Dragon King's Pregnant Runaway",
    category: "Fantasy",
    views: "6.4M",
    image:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=85",
  },
  {
    id: 10,
    title: "The CEO's Secret Bride",
    category: "Billionaire",
    views: "3.7M",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=85",
    badge: "New",
  },
  {
    id: 11,
    title: "My Billionaire Ex Came Back",
    category: "Romance",
    views: "8.2M",
    image:
      "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=600&q=85",
  },
  {
    id: 12,
    title: "Married to the Cold CEO",
    category: "Romance",
    views: "5.6M",
    image:
      "https://images.unsplash.com/photo-1496440737103-cd596325d314?auto=format&fit=crop&w=600&q=85",
    badge: "Hot",
  },
];

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

  const filteredDramas = useMemo(() => {
    let result = dramas;

    if (activeTab === "New") {
      result = dramas.filter((drama) => drama.badge === "New");
    }

    if (activeTab === "Rankings") {
      result = [...dramas].sort(
        (a, b) =>
          parseFloat(b.views) -
          parseFloat(a.views)
      );
    }

    if (activeTab === "Categories") {
      result = dramas.filter(
        (drama) =>
          drama.category === "Revenge" ||
          drama.category === "Sweet Love"
      );
    }

    if (activeTab === "Anime") {
      result = dramas.filter(
        (drama) => drama.category === "Supernatural"
      );
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
                            drama.badge === "Hot"
                              ? "hot"
                              : "new"
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

                    <h2 className="drama-title">
                      {drama.title}
                    </h2>

                    <p className="drama-category">
                      {drama.category}
                    </p>
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
              onClick={() =>
                showComingSoon("Discount")
              }
            >
              <span className="discount-emoji">
                🎁
              </span>
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
                onClick={() =>
                  showComingSoon("Settings")
                }
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
                <h2>Welcome to REVELA</h2>
                <p>Sign in to personalize your experience</p>
              </div>

              <button
                className="login-button"
                onClick={() =>
                  showComingSoon("Login / Register")
                }
              >
                Sign In
              </button>

            </section>

            {/* COINS */}

            <section className="wallet-card">

              <div className="wallet-item">
                <div className="wallet-icon coin">
                  🪙
                </div>

                <div>
                  <strong>0</strong>
                  <span>Coins</span>
                </div>
              </div>

              <div className="wallet-divider"></div>

              <div className="wallet-item">
                <div className="wallet-icon gift">
                  🎁
                </div>

                <div>
                  <strong>0</strong>
                  <span>Rewards</span>
                </div>
              </div>

            </section>

            {/* MENU */}

            <section className="profile-menu">

              <button
                className="profile-menu-item"
                onClick={() =>
                  showComingSoon("Watch History")
                }
              >
                <span className="menu-icon">
                  🕘
                </span>

                <span className="menu-text">
                  Watch History
                </span>

                <ChevronIcon />
              </button>

              <button
                className="profile-menu-item"
                onClick={() =>
                  showComingSoon("My List")
                }
              >
                <span className="menu-icon">
                  🔖
                </span>

                <span className="menu-text">
                  My List
                </span>

                <ChevronIcon />
              </button>

              <button
                className="profile-menu-item"
                onClick={() =>
                  showComingSoon("Downloads")
                }
              >
                <span className="menu-icon">
                  ⬇
                </span>

                <span className="menu-text">
                  Downloads
                </span>

                <ChevronIcon />
              </button>

              <button
                className="profile-menu-item"
                onClick={() =>
                  showComingSoon("Notifications")
                }
              >
                <span className="menu-icon">
                  🔔
                </span>

                <span className="menu-text">
                  Notifications
                </span>

                <span className="menu-badge">
                  0
                </span>

                <ChevronIcon />
              </button>

              <button
                className="profile-menu-item"
                onClick={() =>
                  showComingSoon("Help & Feedback")
                }
              >
                <span className="menu-icon">
                  ❓
                </span>

                <span className="menu-text">
                  Help & Feedback
                </span>

                <ChevronIcon />
              </button>

              <button
                className="profile-menu-item"
                onClick={() =>
                  showComingSoon("About Thio")
                }
              >
                <span className="menu-icon">
                  ℹ
                </span>

                <span className="menu-text">
                  About Thio
                </span>

                <ChevronIcon />
              </button>

            </section>

            <div className="profile-version">
              REVELA v1.0.0
            </div>

          </main>
        )}

        {/* =========================
            OTHER TABS
        ========================= */}

        {activeNav === "For You" && (
          <div className="coming-page">
            <div className="coming-icon">▶</div>
            <h2>For You</h2>
            <p>
              Personalized recommendations will
              appear here.
            </p>
          </div>
        )}

        {activeNav === "Member" && (
          <div className="coming-page">
            <div className="coming-icon">♕</div>
            <h2>Member</h2>
            <p>
              Membership and premium features will
              appear here.
            </p>
          </div>
        )}

        {activeNav === "My List" && (
          <div className="coming-page">
            <div className="coming-icon">🔖</div>
            <h2>My List</h2>
            <p>
              Your saved dramas will appear here.
            </p>
          </div>
        )}

        {/* =========================
            BOTTOM NAVIGATION
        ========================= */}

        <nav className="bottom-navigation">

          <button
            className={`bottom-item ${
              activeNav === "Home"
                ? "active"
                : ""
            }`}
            onClick={goToHome}
          >
            <HomeIcon />
            <span>Home</span>
          </button>

          <button
            className={`bottom-item ${
              activeNav === "For You"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveNav("For You")
            }
          >
            <VideoIcon />
            <span>For You</span>
          </button>

          <button
            className={`bottom-item ${
              activeNav === "Member"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveNav("Member")
            }
          >
            <MemberIcon />
            <span>Member</span>
          </button>

          <button
            className={`bottom-item ${
              activeNav === "My List"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveNav("My List")
            }
          >
            <BookmarkIcon />
            <span>My List</span>
          </button>

          <button
            className={`bottom-item ${
              activeNav === "Profile"
                ? "active"
                : ""
            }`}
            onClick={goToProfile}
          >
            <div className="profile-icon-wrapper">
              <ProfileIcon />

              <span className="notification-dot"></span>
            </div>

            <span>Profile</span>
          </button>

        </nav>

      </div>
    </div>
  );
}

export default App;